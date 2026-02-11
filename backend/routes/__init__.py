"""
API route blueprints for Ranking Checker
"""
from .stream import stream_bp
from .bulk import bulk_bp
from .templates import templates_bp
from .history import history_bp
from .settings import settings_bp


def register_blueprints(app):
    """
    Register all blueprints to Flask app

    Args:
        app: Flask application instance
    """
    app.register_blueprint(stream_bp)
    app.register_blueprint(bulk_bp)
    app.register_blueprint(templates_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(settings_bp)


__all__ = [
    'stream_bp',
    'bulk_bp',
    'templates_bp',
    'history_bp',
    'settings_bp',
    'register_blueprints',
]
