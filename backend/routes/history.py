from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from models.rank_history import RankHistory

history_bp = Blueprint("history", __name__, url_prefix="/api/history")

@history_bp.route("/daily", methods=["GET"])
def get_daily_history():
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