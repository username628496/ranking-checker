#!/usr/bin/env python3
"""
Migration script to add check_type column to rank_history table
"""
from extensions import db
from app import app

def migrate():
    with app.app_context():
        # Check if column already exists
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('rank_history')]

        if 'check_type' not in columns:
            print("Adding check_type column to rank_history table...")
            with db.engine.connect() as conn:
                conn.execute(db.text('ALTER TABLE rank_history ADD COLUMN check_type VARCHAR(20) DEFAULT "single"'))
                conn.commit()
            print("✓ check_type column added successfully")
        else:
            print("✓ check_type column already exists")

if __name__ == "__main__":
    migrate()
