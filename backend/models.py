from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Template(db.Model):
    __tablename__ = "templates"

    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    keywords = db.Column(db.Text, nullable=False)   # Lưu dạng \n
    domains = db.Column(db.Text, nullable=False)    # Lưu dạng \n
    created_at = db.Column(db.DateTime, default=datetime.utcnow)