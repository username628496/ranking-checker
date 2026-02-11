from extensions import db
from datetime import datetime

class RankHistory(db.Model):
    __tablename__ = "rank_history"

    id = db.Column(db.Integer, primary_key=True)
    keyword = db.Column(db.String(255), nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    position = db.Column(db.Integer, nullable=True)
    url = db.Column(db.String(500))
    location = db.Column(db.String(50))
    device = db.Column(db.String(50))
    checked_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    session_id = db.Column(db.String(100), index=True)
    check_type = db.Column(db.String(20), default="single")
    api_credits_used = db.Column(db.Integer, default=1)

    def to_dict(self):
        return {
            "id": self.id,
            "keyword": self.keyword,
            "domain": self.domain,
            "position": self.position,
            "url": self.url,
            "location": self.location,
            "device": self.device,
            "checked_at": self.checked_at.strftime("%Y-%m-%d %H:%M:%S"),
        }