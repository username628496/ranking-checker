from extensions import db
from datetime import datetime, timedelta

class KeywordTracking(db.Model):
    """Model để lưu cấu hình tracking từ khóa hàng ngày"""
    __tablename__ = "keyword_tracking"

    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(100), nullable=True)  # PIC - Person In Charge
    keyword = db.Column(db.String(200), nullable=False)
    domain = db.Column(db.String(200), nullable=False)  # Domain gốc
    ranking_domain = db.Column(db.String(200), nullable=True)  # Domain thực tế rank (sau redirect)
    location = db.Column(db.String(50), default='vn')
    device = db.Column(db.String(20), default='desktop')

    # Tần suất check: 'daily', 'every_3_days', 'weekly'
    frequency = db.Column(db.String(20), default='daily')

    # Active status
    is_active = db.Column(db.Boolean, default=True)

    # Next check time (for cron job)
    next_check_date = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_checked_at = db.Column(db.DateTime, nullable=True)

    # Index để query nhanh
    __table_args__ = (
        db.Index('idx_keyword_domain', 'keyword', 'domain'),
        db.Index('idx_next_check', 'next_check_date', 'is_active'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_name': self.user_name,
            'keyword': self.keyword,
            'domain': self.domain,
            'ranking_domain': self.ranking_domain,
            'location': self.location,
            'device': self.device,
            'frequency': self.frequency,
            'is_active': self.is_active,
            'next_check_date': self.next_check_date.isoformat() if self.next_check_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_checked_at': self.last_checked_at.isoformat() if self.last_checked_at else None,
        }
