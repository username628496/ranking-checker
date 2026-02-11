"""
Settings and validation endpoints
"""
from flask import Blueprint, request, jsonify
import requests

from config import Config, logger


settings_bp = Blueprint('settings', __name__)


@settings_bp.route("/api/validate-api-key", methods=["POST"])
def validate_api_key():
    """
    Validate Serper API key by making a test request from backend

    This is more secure than validating from frontend because:
    - API key is not exposed in browser network tab
    - Prevents CORS issues
    - Allows rate limiting and logging

    Request JSON:
        {
            "api_key": "your_serper_api_key_here"
        }

    Returns:
        {
            "valid": true/false,
            "message": "Success message or error details"
        }

    Errors:
        400: Missing api_key
        500: Validation failed
    """
    data = request.json or {}
    api_key = data.get("api_key", "").strip()

    if not api_key:
        return jsonify({
            "valid": False,
            "message": "API key is required"
        }), 400

    # Make a minimal test request to Serper API
    try:
        test_payload = {
            "q": "test",
            "gl": "vn",
            "hl": "vi",
            "num": 1,  # Only 1 result to minimize credit usage
        }

        headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json",
            "User-Agent": Config.USER_AGENT,
        }

        logger.info("Validating Serper API key...")

        response = requests.post(
            "https://google.serper.dev/search",
            headers=headers,
            json=test_payload,
            timeout=10,
            verify=True,
        )

        # Check response status
        if response.status_code == 200:
            data = response.json()

            # Check for API errors in response body
            if "error" in data:
                logger.warning(f"Serper API returned error: {data['error']}")
                return jsonify({
                    "valid": False,
                    "message": f"API key invalid: {data['error']}"
                })

            # If we got organic results, key is valid
            if "organic" in data:
                logger.info("Serper API key validated successfully")
                return jsonify({
                    "valid": True,
                    "message": "API key is valid"
                })

            # Unexpected response format
            logger.warning(f"Unexpected Serper response format: {data}")
            return jsonify({
                "valid": False,
                "message": "Unexpected API response format"
            })

        elif response.status_code == 401:
            return jsonify({
                "valid": False,
                "message": "Invalid API key or unauthorized"
            })

        elif response.status_code == 429:
            return jsonify({
                "valid": False,
                "message": "Rate limit exceeded. Please try again later."
            })

        else:
            logger.error(f"Serper API returned status {response.status_code}")
            return jsonify({
                "valid": False,
                "message": f"API validation failed with status {response.status_code}"
            })

    except requests.Timeout:
        logger.error("Serper API request timed out")
        return jsonify({
            "valid": False,
            "message": "Request timed out. Please check your network connection."
        }), 500

    except requests.RequestException as e:
        logger.error(f"Serper API request failed: {e}")
        return jsonify({
            "valid": False,
            "message": f"Network error: {str(e)}"
        }), 500

    except Exception as e:
        logger.error(f"Unexpected error validating API key: {e}")
        return jsonify({
            "valid": False,
            "message": "An unexpected error occurred"
        }), 500
