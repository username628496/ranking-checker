"""
Bulk 30-domain check endpoint
"""
import uuid
from urllib.parse import urlparse
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify

from config import Config, logger
from utils import validate_keyword
from services import serper_search
from extensions import db
from models.rank_history import RankHistory


# Blueprint
bulk_bp = Blueprint('bulk', __name__)


@bulk_bp.route("/api/bulk/check", methods=["POST"])
def bulk_check():
    """
    Check multiple keywords and return top N domains for each

    Request JSON:
        {
            "keywords": ["keyword1", "keyword2", ...],
            "location": "vn",
            "device": "desktop",
            "limit": 30
        }

    Returns:
        {
            "results": [
                {
                    "keyword": "keyword1",
                    "topDomains": [
                        {"position": 1, "domain": "example.com", "url": "...", "title": "..."},
                        ...
                    ]
                },
                ...
            ]
        }

    Errors:
        400: Invalid keywords, invalid limit
        500: Processing error
    """
    data = request.json or {}
    keywords = data.get("keywords", [])
    location = data.get("location", "vn")
    device = data.get("device", "desktop")
    limit = int(data.get("limit", 30))

    # Validate input
    if not keywords or not isinstance(keywords, list):
        return jsonify({"error": "keywords must be a non-empty array"}), 400

    # Limit range: 1-100
    if limit < 1 or limit > 100:
        limit = 30

    # Generate session_id for this bulk check
    session_id = str(uuid.uuid4())

    results = []

    try:
        for keyword in keywords:
            # Validate keyword
            if not validate_keyword(keyword):
                continue

            # Get top 30 results from Serper (fetch 50 to ensure we have enough after filtering)
            organic = serper_search(keyword, location, device, max_results=50)

            top_domains = []

            # Loop through results until we have exactly 30 valid results
            for item in organic:
                # Stop when we have enough results
                if len(top_domains) >= limit:
                    break

                link = item.get("link", "")
                title = item.get("title", "")

                # Skip empty links
                if not link:
                    continue

                try:
                    parsed = urlparse(link)
                    domain = parsed.netloc.lower()

                    # Remove www prefix
                    if domain.startswith("www."):
                        domain = domain[4:]

                    top_domains.append({
                        "position": len(top_domains) + 1,  # 1, 2, 3... 30
                        "domain": domain,
                        "url": link,
                        "title": title,
                    })

                except:
                    continue

            results.append({
                "keyword": keyword,
                "topDomains": top_domains,
            })

            # Save history for this keyword (top 30 domains)
            try:
                for domain_info in top_domains[:30]:
                    history = RankHistory(
                        keyword=keyword.strip(),
                        domain=domain_info["domain"].strip(),
                        position=domain_info["position"],
                        url=domain_info["url"][:500],
                        location=location,
                        device=device,
                        checked_at=datetime.now(timezone.utc),
                        session_id=session_id,
                        check_type="bulk"
                    )
                    db.session.add(history)

                db.session.commit()
                logger.info(f"Saved bulk history for {keyword}: {len(top_domains)} domains")

            except Exception as e:
                logger.warning(f"Failed to save bulk history for {keyword}: {e}")
                db.session.rollback()

        return jsonify({"results": results})

    except Exception as e:
        logger.error(f"Bulk check error: {e}")
        return jsonify({"error": str(e)}), 500
