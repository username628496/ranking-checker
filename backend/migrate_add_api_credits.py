#!/usr/bin/env python3
"""
Migration script to add api_credits_used column to rank_history table
"""
from extensions import db
from app import app

def migrate():
    with app.app_context():
        # Check if column already exists
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('rank_history')]

        if 'api_credits_used' not in columns:
            print("Adding api_credits_used column to rank_history table...")
            with db.engine.connect() as conn:
                conn.execute(db.text('ALTER TABLE rank_history ADD COLUMN api_credits_used INTEGER DEFAULT 1'))
                conn.commit()
            print("✓ api_credits_used column added successfully")
        else:
            print("✓ api_credits_used column already exists")

if __name__ == "__main__":
    migrate()
