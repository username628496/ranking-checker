from extensions import db
from datetime import datetime

class Template(db.Model):
    __tablename__ = "templates"

    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    keywords = db.Column(db.Text, nullable=False)
    domains = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Template {self.name}>"