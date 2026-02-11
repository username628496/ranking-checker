"""
Ranking detection and processing service
"""
from typing import Dict
from urllib.parse import urlparse
from datetime import datetime, timedelta, timezone

from config import Config, logger
from utils import normalize_host, final_host_for_input, final_host_of_url
from .serper import serper_search


def process_pair(
    keyword: str,
    domain_input: str,
    location: str,
    device: str,
    session_id: str = None,
    check_type: str = "single",
    save_to_db: bool = True,
    db_session=None,
    rank_history_model=None,
    api_key: str = None
) -> Dict:
    """
    Process one keyword-domain pair and detect ranking

    Steps:
    1. Normalize domain and follow redirects
    2. Search Serper API for top 30 results
    3. Match target domain in SERP results (exact match or via redirect)
    4. Save to database if enabled
    5. Return result dict

    Args:
        keyword: Search keyword
        domain_input: Target domain to find
        location: Location code (vn, hanoi, etc.)
        device: Device type (desktop, mobile)
        session_id: Session identifier for grouping
        check_type: "single" or "bulk"
        save_to_db: Whether to save to database (default True)
        db_session: Database session object (required if save_to_db=True)
        rank_history_model: RankHistory model class (required if save_to_db=True)

    Returns:
        Dict with keys: keyword, domain, position, url, redirect_chain, checked_at, location_display, error

    Examples:
        result = process_pair("seo tools", "moz.com", "vn", "desktop", session_id="abc123")
        # Returns: {"keyword": "seo tools", "domain": "moz.com", "position": 5, ...}
    """
    # Timezone: Vietnam UTC+7
    now = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=7)))

    out = {
        "keyword": keyword,
        "domain": domain_input,
        "position": "N/A",
        "url": "-",
        "redirect_chain": [],
        "checked_at": now.strftime("%d/%m/%Y %H:%M:%S"),
        "location_display": Config.LOCATION_MAP.get(location, "Không xác định"),
        "error": None,
    }

    try:
        # Step 1: Normalize domain
        host = normalize_host(domain_input)
        if not host:
            raise ValueError("Invalid domain")

        # Step 2: Follow redirect chain to get final destination
        final_host, chain_hosts = final_host_for_input(host)
        out["redirect_chain"] = chain_hosts[:10]

        # Step 3: Search Serper API for top 30 results
        organic = serper_search(keyword, location, device, max_results=30, api_key=api_key)

        # Log target domain info
        logger.info(f"Searching for: {keyword} | Target: {final_host} | Chain: {chain_hosts}")

        matched = False
        ranking_host = None  # Store the actual ranking host

        # Step 4: Match target domain in SERP results
        for idx, item in enumerate(organic):
            link = item.get("link", "")
            if not link:
                continue

            # Use actualPosition from pagination if available
            actual_position = item.get("actualPosition", idx + 1)

            # Extract and normalize host from SERP link
            try:
                h = urlparse(link).netloc.lower()
                if h.startswith("www."):
                    h = h[4:]
                if ":" in h:
                    h = h.split(":")[0]
            except Exception:
                h = ""

            # Debug log for first 30 results
            if idx < 30:
                logger.debug(f"  [#{actual_position}] Checking: {h} | URL: {link[:100]}")

            # EXACT host match only - no partial matching!
            if h and (h == final_host or h in chain_hosts):
                out["position"] = actual_position
                out["url"] = link[:200]
                ranking_host = h
                matched = True
                logger.info(
                    f"✅ Found exact match: {keyword} | {h} == {final_host} "
                    f"at position #{actual_position}"
                )
                break

            # Only for top 10: follow redirect to check final destination
            # This handles cases where Google shows a redirect URL
            if idx < 10:
                try:
                    fh = final_host_of_url(link)
                    if fh:
                        logger.debug(f"  [#{actual_position}] After redirect: {fh}")

                    # Check if redirect destination matches our target
                    if fh and (fh == final_host or fh in chain_hosts):
                        out["position"] = actual_position
                        out["url"] = link[:200]
                        ranking_host = h  # Save the SERP host (not redirect destination)
                        matched = True
                        logger.info(
                            f"✅ Found match via redirect: {keyword} | {h} → {fh} "
                            f"at position #{actual_position}"
                        )
                        break
                except Exception as e:
                    logger.debug(f"  [#{actual_position}] Redirect check failed: {e}")
                    continue

        # Add ranking_host to output
        if ranking_host:
            out["ranking_host"] = ranking_host

        if not matched:
            out["position"] = "N/A"
            out["url"] = "-"
            logger.warning(
                f"❌ No match found: {keyword} | Target: {final_host} | "
                f"Chain: {chain_hosts} | Checked {len(organic)} results"
            )

    except Exception as e:
        logger.warning(f"process_pair error: {keyword} | {domain_input} | {e}")
        out["error"] = "Processing failed"

    # Step 5: Save to database
    if save_to_db and db_session and rank_history_model:
        try:
            pos = None
            try:
                pos = int(out["position"]) if str(out["position"]).isdigit() else None
            except Exception:
                pos = None

            history = rank_history_model(
                keyword=keyword.strip(),
                domain=domain_input.strip(),
                position=pos,
                url=out.get("url", "-"),
                location=location,
                device=device,
                checked_at=datetime.now(timezone.utc),
                session_id=session_id,
                check_type=check_type
            )

            db_session.add(history)
            db_session.commit()
            logger.info(f"Lưu lịch sử: {keyword} | {domain_input} | {pos}")
        except Exception as e:
            logger.warning(f"Không thể lưu lịch sử: {e}")

    return out
