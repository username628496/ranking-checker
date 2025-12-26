from extensions import db
from datetime import datetime
import json

class MonthlySnapshot(db.Model):
    """Model để lưu snapshot ranking cuối mỗi tháng"""
    __tablename__ = "monthly_snapshot"

    id = db.Column(db.Integer, primary_key=True)
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)  # 1-12
    keyword = db.Column(db.String(200), nullable=False)
    domain = db.Column(db.String(200), nullable=False)

    # JSON array chứa data 30 ngày của tháng đó
    # Format: [{"date": "2024-12-01", "position": 5}, ...]
    daily_data = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Index để query nhanh
    __table_args__ = (
        db.Index('idx_year_month', 'year', 'month'),
        db.Index('idx_keyword_domain_month', 'keyword', 'domain', 'year', 'month'),
        db.UniqueConstraint('year', 'month', 'keyword', 'domain', name='uq_snapshot_month_keyword_domain'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'year': self.year,
            'month': self.month,
            'keyword': self.keyword,
            'domain': self.domain,
            'daily_data': json.loads(self.daily_data) if self.daily_data else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    @staticmethod
    def create_snapshot(year, month, keyword, domain, daily_data_list):
        """
        Tạo snapshot cho một keyword-domain
        daily_data_list: list of {"date": "YYYY-MM-DD", "position": int | None}
        """
        snapshot = MonthlySnapshot(
            year=year,
            month=month,
            keyword=keyword,
            domain=domain,
            daily_data=json.dumps(daily_data_list, ensure_ascii=False)
        )
        return snapshot
