"""
Ranking Checker API - Refactored Main Application

A Flask-based SEO ranking checker with real-time SSE streaming and bulk checking.
"""
from datetime import datetime
from urllib.parse import urlparse

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import Config, logger
from extensions import db
from routes import register_blueprints
from services import serper_search
from utils import normalize_host


# ------------------ FLASK APP SETUP ------------------
def create_app():
    """
    Application factory pattern

    Returns:
        Flask app instance
    """
    app = Flask(__name__)

    # Configure app
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = Config.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = Config.SQLALCHEMY_TRACK_MODIFICATIONS

    print(f"Using database at: {app.config['SQLALCHEMY_DATABASE_URI']}")

    # Setup CORS
    if Config.ENVIRONMENT == "production":
        CORS(app, resources={
            r"/*": {
                "origins": [
                    "https://ranking.aeseo1.org",
                    "http://ranking.aeseo1.org"
                ],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True
            }
        })
    else:
        CORS(app)  # Development: allow all origins

    # Initialize extensions
    db.init_app(app)

    # Create database tables
    with app.app_context():
        db.create_all()

    # Register blueprints
    register_blueprints(app)

    # Register basic routes
    register_basic_routes(app)

    return app


def register_basic_routes(app):
    """
    Register basic health check and test routes

    Args:
        app: Flask application instance
    """
    @app.route("/health")
    def health():
        """Health check endpoint"""
        return jsonify({
            "status": "ok",
            "time": datetime.now().isoformat(),
            "env": Config.ENVIRONMENT
        })

    @app.route("/")
    def root():
        """API info endpoint"""
        return jsonify({
            "message": "Ranking Checker API (unlimited) is running",
            "version": "2.0",
            "docs": "/api/docs"
        })

    @app.route("/api/test/serper", methods=["GET"])
    def test_serper():
        """
        Test endpoint to verify Serper API responses

        Query params:
            - keyword: Search keyword (default "seo tools")
            - num: Number of results (default 100)
            - domain: Optional target domain to search for

        Returns:
            JSON with search results summary
        """
        keyword = request.args.get("keyword", "seo tools")
        num = int(request.args.get("num", 100))
        target_domain = request.args.get("domain", None)

        try:
            results = serper_search(keyword, "vn", "desktop", max_results=num)

            response_data = {
                "keyword": keyword,
                "requested": num,
                "received": len(results),
                "first_5": [
                    {
                        "position": r.get("position", idx + 1),
                        "title": r.get("title", ""),
                        "link": r.get("link", ""),
                        "domain": urlparse(r.get("link", "")).netloc
                    }
                    for idx, r in enumerate(results[:5])
                ],
                "last_5": [
                    {
                        "position": r.get("position", len(results) - 5 + idx + 1),
                        "title": r.get("title", ""),
                        "link": r.get("link", ""),
                        "domain": urlparse(r.get("link", "")).netloc
                    }
                    for idx, r in enumerate(results[-5:])
                ] if len(results) > 5 else []
            }

            # If target domain specified, search for it in results
            if target_domain:
                normalized_target = normalize_host(target_domain)
                found_positions = []

                for idx, r in enumerate(results):
                    link = r.get("link", "")
                    try:
                        h = urlparse(link).netloc.lower()
                        if h.startswith("www."):
                            h = h[4:]
                        if ":" in h:
                            h = h.split(":")[0]

                        if h == normalized_target:
                            found_positions.append({
                                "position": r.get("position", idx + 1),
                                "title": r.get("title", ""),
                                "link": link,
                                "domain": h
                            })
                    except Exception:
                        pass

                response_data["target_domain"] = target_domain
                response_data["normalized_target"] = normalized_target
                response_data["found_at"] = found_positions
                response_data["found_count"] = len(found_positions)

            return jsonify(response_data)

        except Exception as e:
            return jsonify({"error": str(e)}), 500


# ------------------ APPLICATION INSTANCE ------------------
app = create_app()


# ------------------ MAIN ------------------
if __name__ == "__main__":
    print(f"API Key: {'Set' if Config.SERPER_API_KEY else 'Missing'}")
    print(f"Environment: {Config.ENVIRONMENT}")
    print(f"Max Workers: {Config.MAX_WORKERS}")

    app.run(host="0.0.0.0", port=8001, debug=False, threaded=True)
