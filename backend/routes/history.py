"""
History and session endpoints
"""
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from sqlalchemy import func

from config import logger
from extensions import db
from models.rank_history import RankHistory


history_bp = Blueprint("history", __name__, url_prefix="/api/history")


@history_bp.route("/daily", methods=["GET"])
def get_daily_history():
    """
    Get daily history for a specific keyword-domain pair

    Query params:
        - keyword: Search keyword
        - domain: Target domain
        - days: Number of days to look back (default 30)

    Returns:
        [{"id": 1, "keyword": "...", ...}, ...]

    Errors:
        400: Missing keyword or domain
    """
    keyword = request.args.get("keyword")
    domain = request.args.get("domain")
    days = int(request.args.get("days", 30))

    if not keyword or not domain:
        return jsonify({"error": "Thiếu keyword hoặc domain"}), 400

    start_date = datetime.utcnow() - timedelta(days=days)
    records = (RankHistory.query
        .filter(RankHistory.keyword == keyword)
        .filter(RankHistory.domain == domain)
        .filter(RankHistory.checked_at >= start_date)
        .order_by(RankHistory.checked_at.asc())
        .all()
    )

    return jsonify([r.to_dict() for r in records])


@history_bp.route("/all", methods=["GET"])
def get_all_history():
    """
    Get all rank history records with filtering

    Query params:
        - keyword: Filter by keyword (partial match)
        - domain: Filter by domain (partial match)
        - location: Filter by location code
        - device: Filter by device type
        - start_date: Filter by start date (ISO format)
        - end_date: Filter by end date (ISO format)
        - limit: Max results (default 1000)

    Returns:
        {
            "results": [
                {"id": 1, "keyword": "...", "domain": "...", ...},
                ...
            ]
        }
    """
    keyword = request.args.get("keyword")
    domain = request.args.get("domain")
    location = request.args.get("location")
    device = request.args.get("device")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    limit = request.args.get("limit", 1000, type=int)

    query = RankHistory.query

    # Apply filters
    if keyword:
        query = query.filter(RankHistory.keyword.like(f"%{keyword}%"))
    if domain:
        query = query.filter(RankHistory.domain.like(f"%{domain}%"))
    if location:
        query = query.filter_by(location=location)
    if device:
        query = query.filter_by(device=device)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(RankHistory.checked_at >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(RankHistory.checked_at <= end_dt)
        except ValueError:
            pass

    history = query.order_by(RankHistory.checked_at.desc()).limit(limit).all()

    return jsonify({
        "results": [{
            "id": h.id,
            "keyword": h.keyword,
            "domain": h.domain,
            "position": h.position,
            "url": h.url,
            "location": h.location,
            "device": h.device,
            "checked_at": h.checked_at.isoformat() + 'Z' if h.checked_at else None,
        } for h in history]
    })


@history_bp.route("/sessions", methods=["GET"])
def get_sessions():
    """
    Get unique check sessions grouped by session_id with pagination

    Query params:
        - page: Page number (default 1)
        - per_page: Results per page (default 20, max 100)

    Returns:
        {
            "sessions": [
                {
                    "session_id": "session_xxx",
                    "check_type": "single",
                    "checked_at": "2024-01-01T00:00:00",
                    "keyword_count": 5,
                    "domain_count": 5,
                    "total_records": 5,
                    "api_credits_used": 5,
                    "success": true,
                    "location": "vn",
                    "device": "desktop"
                },
                ...
            ],
            "total": 100,
            "page": 1,
            "per_page": 20,
            "total_pages": 5
        }

    Errors:
        500: Database error
    """
    try:
        # Get pagination parameters
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        # Ensure valid values
        page = max(1, page)
        per_page = min(max(1, per_page), 100)  # Max 100 per page

        # Base query for sessions
        base_query = db.session.query(
            RankHistory.session_id,
            RankHistory.check_type,
            func.min(RankHistory.checked_at).label('checked_at'),
            func.count(func.distinct(RankHistory.keyword)).label('keyword_count'),
            func.count(func.distinct(RankHistory.domain)).label('domain_count'),
            func.count(RankHistory.id).label('total_records'),
            func.sum(RankHistory.api_credits_used).label('api_credits_used'),
            func.sum(db.case((RankHistory.position.isnot(None), 1), else_=0)).label('success_count'),
            RankHistory.location,
            RankHistory.device
        ).filter(
            RankHistory.session_id.isnot(None)
        ).group_by(
            RankHistory.session_id,
            RankHistory.check_type,
            RankHistory.location,
            RankHistory.device
        )

        # Get total count
        total = base_query.count()

        # Get paginated results
        sessions_query = base_query.order_by(
            func.min(RankHistory.checked_at).desc()
        ).limit(per_page).offset((page - 1) * per_page).all()

        sessions = [{
            "session_id": s.session_id,
            "check_type": s.check_type or "single",
            "checked_at": s.checked_at.isoformat() + 'Z' if s.checked_at else None,
            "keyword_count": s.keyword_count,
            "domain_count": s.domain_count,
            "total_records": s.total_records,
            "api_credits_used": s.api_credits_used or 0,
            "success": s.success_count > 0,
            "location": s.location,
            "device": s.device,
        } for s in sessions_query]

        total_pages = (total + per_page - 1) // per_page  # Ceiling division

        return jsonify({
            "sessions": sessions,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        })

    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        return jsonify({"error": str(e)}), 500