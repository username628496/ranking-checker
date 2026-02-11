"""
Single check SSE streaming endpoints
"""
import json
import time
import secrets
from urllib.parse import unquote_plus
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import Blueprint, request, jsonify, Response, stream_with_context

from config import Config, logger
from utils import validate_keyword, validate_domain_like, chunked
from services import process_pair
from extensions import db
from models.rank_history import RankHistory


# Blueprint
stream_bp = Blueprint('stream', __name__)

# In-memory session storage
SESSIONS = {}


@stream_bp.route("/api/stream/save", methods=["POST"])
def save():
    """
    Save session data and generate session_id for streaming

    Request form data:
        - keywords: newline-separated keywords
        - domains: newline-separated domains
        - location: location code (vn, hanoi, etc.)
        - device: device type (desktop, mobile)

    Returns:
        {"session_id": "session_xxx"}

    Errors:
        400: Missing fields, empty input, invalid keywords/domains
    """
    form = request.form.to_dict(flat=True)

    # Validate required fields
    for f in ("keywords", "domains", "device", "location"):
        if not form.get(f):
            return jsonify({"error": f"Missing field: {f}"}), 400

    # Parse input
    kws_all = [s.strip() for s in form["keywords"].splitlines() if s.strip()]
    doms_all = [s.strip() for s in form["domains"].splitlines() if s.strip()]

    if not kws_all or not doms_all:
        return jsonify({"error": "Empty input"}), 400

    # Validate keywords
    bad_kw = [k for k in kws_all if not validate_keyword(k)]
    if bad_kw:
        return jsonify({"error": f"Keyword không hợp lệ (ví dụ): {bad_kw[0][:50]}"}), 400

    # Validate domains
    bad_dm = [d for d in doms_all if not validate_domain_like(d)]
    if bad_dm:
        return jsonify({"error": f"Domain không hợp lệ (ví dụ): {bad_dm[0][:50]}"}), 400

    # Get API key from request (optional)
    api_key = form.get("api_key")

    # Generate session_id
    sid = f"session_{secrets.token_urlsafe(8)}_{int(time.time())}"
    SESSIONS[sid] = form

    return jsonify({"session_id": sid})


@stream_bp.route("/api/stream")
def stream():
    """
    Server-Sent Events (SSE) endpoint for real-time ranking results

    Query params:
        - session_id: Session ID from /api/stream/save

    Returns:
        SSE stream with data events containing JSON results

    Event format:
        data: {"keyword": "...", "domain": "...", "position": 5, ...}
        event: end
        data: done
    """
    @stream_with_context
    def gen():
        sid = request.args.get("session_id", "").strip()

        # Validate session
        if not sid or sid not in SESSIONS:
            yield 'data: {"error":"Invalid session"}\n\n'
            yield "event: end\ndata: done\n\n"
            return

        form = SESSIONS.get(sid) or {}
        device = form.get("device", "desktop")
        location = form.get("location", "vn")
        api_key = form.get("api_key")  # Get API key from session

        # Parse keywords and domains
        kws = [s.strip() for s in unquote_plus(form.get("keywords", "")).splitlines() if s.strip()]
        doms = [s.strip() for s in unquote_plus(form.get("domains", "")).splitlines() if s.strip()]
        pairs = list(zip(kws, doms))

        try:
            # Process pairs in parallel with ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as ex:
                for batch in chunked(pairs, Config.CHUNK_SIZE):
                    # Submit tasks
                    futs = [
                        ex.submit(
                            process_pair,
                            k, d, location, device, sid, "single",
                            save_to_db=True,
                            db_session=db.session,
                            rank_history_model=RankHistory,
                            api_key=api_key
                        )
                        for k, d in batch
                    ]

                    # Stream results as they complete
                    for f in as_completed(futs):
                        try:
                            row = f.result(timeout=60)
                            yield f"data: {json.dumps(row, ensure_ascii=False)}\n\n"
                        except Exception as e:
                            logger.warning(f"task error: {e}")
                            yield 'data: {"error":"Processing failed","keyword":"unknown","domain":"unknown"}\n\n'

        except Exception as e:
            logger.error(f"SSE error: {e}")
            yield 'data: {"error":"Stream failed"}\n\n'

        # Signal completion
        yield "event: end\ndata: done\n\n"

    return Response(gen(), mimetype="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # Disable nginx buffering for SSE
    })
