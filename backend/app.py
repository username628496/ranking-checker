import os
import re
import json
import time
import secrets
import logging
from typing import Dict, List, Optional, Tuple, Iterable
from urllib.parse import urlparse, urljoin, unquote_plus
from datetime import datetime, timedelta
import datetime as dt
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
import requests
from apscheduler.schedulers.background import BackgroundScheduler
import pytz

# Import DB & models
from extensions import db
from models import Template
from models.rank_history import RankHistory
from models.keyword_tracking import KeywordTracking
from models.monthly_snapshot import MonthlySnapshot

# ------------------ ENV & CONFIG ------------------
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Environment loaded")
except Exception:
    print("⚠️  python-dotenv not found")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(16))
    SERPER_API_KEY = os.getenv("SERPER_API_KEY")
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "10"))
    MAX_WORKERS = int(os.getenv("MAX_WORKERS", "6"))
    MAX_REDIRECTS = int(os.getenv("MAX_REDIRECTS", "10"))
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "200"))

    LOCATION_MAP = {
        "vn": "Việt Nam",
        "hochiminh": "TP. Hồ Chí Minh",
        "hanoi": "Hà Nội",
        "danang": "Đà Nẵng",
    }

logging.basicConfig(
    level=logging.DEBUG,  # Changed to DEBUG for detailed logging
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("ranking-unlimited")

# ------------------ FLASK APP ------------------
app = Flask(__name__)
app.config["SECRET_KEY"] = Config.SECRET_KEY
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///templates.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
print(f"📦 Using database at: {app.config['SQLALCHEMY_DATABASE_URI']}")  # ✅ thêm dòng này

# CORS configuration for production
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

db.init_app(app)

with app.app_context():
    db.create_all()

# Bộ nhớ tạm cho session
SESSIONS: Dict[str, Dict] = {}

# ------------------ HELPERS: VALIDATION ------------------
def validate_domain_like(s: str) -> bool:
    return bool(s and len(s) <= 253)

def validate_keyword(kw: str) -> bool:
    if not kw or len(kw.strip()) > 200:
        return False
    return not re.search(r"[<>'\";&|`$]", kw)

def normalize_host(raw: str) -> Optional[str]:
    if not raw:
        return None
    raw = raw.strip()
    host = ""
    try:
        if raw.startswith(("http://", "https://")):
            p = urlparse(raw)
            host = p.netloc
        else:
            host = raw.split("/")[0]
    except Exception:
        return None
    host = host.lower()
    if host.startswith("www."):
        host = host[4:]
    if ":" in host:
        host = host.split(":")[0]
    if not re.match(r"^[a-z0-9][a-z0-9\-._]*[a-z0-9]$", host):
        return None
    return host

# ------------------ HELPERS: REDIRECT ------------------
UA = {"User-Agent": "Mozilla/5.0 (compatible; SERPChecker/0.2)"}

def _follow_http_redirects(url: str) -> Tuple[str, List[str], Optional[requests.Response]]:
    chain_hosts: List[str] = []
    try:
        r = requests.get(url, headers=UA, timeout=Config.REQUEST_TIMEOUT,
                         allow_redirects=True, verify=True)
        for h in r.history:
            try:
                host = urlparse(h.url).netloc.lower()
                if host.startswith("www."): host = host[4:]
                if ":" in host: host = host.split(":")[0]
                chain_hosts.append(host)
            except Exception:
                pass
        try:
            last_host = urlparse(r.url).netloc.lower()
            if last_host.startswith("www."): last_host = last_host[4:]
            if ":" in last_host: last_host = last_host.split(":")[0]
            chain_hosts.append(last_host)
        except Exception:
            pass
        chain_hosts = list(dict.fromkeys(chain_hosts))
        return r.url, chain_hosts, r
    except requests.RequestException:
        return url, chain_hosts, None

META_REFRESH_RE = re.compile(
    r'<meta[^>]+http-equiv=["\']?refresh["\']?[^>]*content=["\']?\s*\d+\s*;\s*url=([^"\'>\s]+)',
    re.I
)

def _maybe_meta_refresh(resp: Optional[requests.Response], base_url: str) -> Optional[str]:
    if not resp:
        return None
    try:
        ctype = resp.headers.get("Content-Type", "")
        if resp.status_code == 200 and "text/html" in ctype:
            text = resp.text[:4096]
            m = META_REFRESH_RE.search(text)
            if m:
                nxt = m.group(1).strip(' "\'' )
                return urljoin(base_url, nxt)
    except Exception:
        pass
    return None

def final_host_for_input(host: str) -> Tuple[str, List[str]]:
    candidates = [f"https://{host}", f"http://{host}"]
    all_hosts: List[str] = []
    final_host = host
    for u in candidates:
        final_url, chain_hosts, resp = _follow_http_redirects(u)
        all_hosts.extend(chain_hosts)
        meta = _maybe_meta_refresh(resp, final_url)
        if meta:
            final_url2, chain_hosts2, _ = _follow_http_redirects(meta)
            all_hosts.extend(chain_hosts2)
            final_url = final_url2
        try:
            h = urlparse(final_url).netloc.lower()
            if h.startswith("www."): h = h[4:]
            if ":" in h: h = h.split(":")[0]
            if h:
                final_host = h
        except Exception:
            pass
    all_hosts.append(final_host)
    all_hosts = list(dict.fromkeys(all_hosts))
    return final_host, all_hosts

def final_host_of_url(url: str) -> Optional[str]:
    final_url, _, resp = _follow_http_redirects(url)
    meta = _maybe_meta_refresh(resp, final_url)
    if meta:
        final_url, _, _ = _follow_http_redirects(meta)
    try:
        h = urlparse(final_url).netloc.lower()
        if h.startswith("www."): h = h[4:]
        if ":" in h: h = h.split(":")[0]
        return h or None
    except Exception:
        return None

# ------------------ SERPER ------------------
def serper_search(keyword: str, location: str, device: str, max_results: int = 100) -> List[Dict]:
    """
    Tìm kiếm qua Serper API và lấy tối đa max_results kết quả.
    Serper API hỗ trợ num từ 1-100 trong 1 request duy nhất.
    """
    if not Config.SERPER_API_KEY:
        raise ValueError("SERPER_API_KEY not configured")

    try:
        payload = {
            "q": keyword[:100],
            "gl": location,
            "hl": "vi",
            "device": device,
            "num": min(max_results, 100),  # Serper max 100 results per request
        }

        logger.info(f"Serper search: {keyword} | num={payload['num']} | location={location}")

        r = requests.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": Config.SERPER_API_KEY, "Content-Type": "application/json", **UA},
            json=payload,
            timeout=Config.REQUEST_TIMEOUT,
            verify=True,
        )
        r.raise_for_status()
        data = r.json()

        if "error" in data:
            logger.error(f"Serper API error: {data['error']}")
            return []

        organic = data.get("organic", [])
        logger.info(f"Serper returned {len(organic)} results for '{keyword}'")

        return organic[:max_results]

    except Exception as e:
        logger.error(f"Serper search failed for '{keyword}': {e}")
        return []

# ------------------ CORE: PROCESS ONE PAIR ------------------
def process_pair(keyword: str, domain_input: str, location: str, device: str) -> Dict:
    """
    Xử lý 1 cặp keyword + domain:
    - Kiểm tra thứ hạng trên SERP (qua Serper)
    - Trả về kết quả
    - Ghi lịch sử vào bảng rank_history
    """
    now = dt.datetime.now(dt.timezone.utc).astimezone(dt.timezone(timedelta(hours=7)))
    out = {
        "keyword": keyword,
        "domain": domain_input,
        "position": "N/A",
        "url": "-",
        "redirect_chain": [],
        "checked_at": now.strftime("%d/%m/%Y %H:%M:%S"),
        "location_display": Config.LOCATION_MAP.get(location, "Không xác định"),
        "error": None,
    }

    try:
        # Làm sạch domain
        host = normalize_host(domain_input)
        if not host:
            raise ValueError("Invalid domain")

        # Theo dõi redirect chain
        final_host, chain_hosts = final_host_for_input(host)
        out["redirect_chain"] = chain_hosts[:10]

        # Gọi Serper API để tìm vị trí (lấy 100 results)
        organic = serper_search(keyword, location, device, max_results=100)

        # Log target domain info
        logger.info(f"🎯 Searching for: {keyword} | Target: {final_host} | Chain: {chain_hosts}")

        matched = False
        ranking_host = None  # Store the actual ranking host

        for idx, item in enumerate(organic):
            link = item.get("link", "")
            if not link:
                continue
            try:
                h = urlparse(link).netloc.lower()
                if h.startswith("www."): h = h[4:]
                if ":" in h: h = h.split(":")[0]
            except Exception:
                h = ""

            # Log first 20 results for debugging
            if idx < 20:
                logger.debug(f"  [{idx+1}] Checking: {h} | URL: {link[:100]}")

            # So khớp host chính xác
            if h and (h == final_host or h in chain_hosts):
                # Serper có thể có hoặc không có field "position"
                # Nếu không có, dùng index + 1 làm position
                position = item.get("position")
                if position is None or position == "":
                    position = idx + 1

                out["position"] = position
                out["url"] = link[:200]
                ranking_host = h  # Save the actual ranking host
                matched = True
                logger.info(f"✅ Found match: {keyword} | {h} == {final_host} at position {position}")
                break

            # Nếu trong top 20 mà chưa match, thử follow redirect
            if idx < 20:
                fh = final_host_of_url(link)
                if fh:
                    logger.debug(f"  [{idx+1}] After redirect: {fh}")
                if fh and (fh == final_host or fh in chain_hosts):
                    position = item.get("position")
                    if position is None or position == "":
                        position = idx + 1

                    out["position"] = position
                    out["url"] = link[:200]
                    ranking_host = h  # Save the SERP ranking host (the one that appears in Google results)
                    matched = True
                    logger.info(f"✅ Found match (via redirect): {keyword} | {fh} at position {position}")
                    break

        # Add ranking_host to output
        if ranking_host:
            out["ranking_host"] = ranking_host

        if not matched:
            out["position"] = "N/A"
            out["url"] = "-"
            logger.warning(f"❌ No match found: {keyword} | {final_host} | Chain: {chain_hosts} | Checked {len(organic)} results")

    except Exception as e:
        logger.warning(f"process_pair error: {keyword} | {domain_input} | {e}")
        out["error"] = "Processing failed"

    # ✅ Ghi lịch sử vào DB (với context Flask)
    try:
        with app.app_context():
            pos = None
            try:
                pos = int(out["position"]) if str(out["position"]).isdigit() else None
            except Exception:
                pos = None

            history = RankHistory(
                keyword=keyword.strip(),
                domain=domain_input.strip(),
                position=pos,
                url=out.get("url", "-"),
                location=location,
                device=device,
                checked_at=dt.datetime.now(dt.timezone.utc),
                session_id=None
            )

            db.session.add(history)
            db.session.commit()
            logger.info(f"💾 Lưu lịch sử: {keyword} | {domain_input} | {pos}")
    except Exception as e:
        logger.warning(f"❌ Không thể lưu lịch sử: {e}")

    return out

# ------------------ UTILS ------------------
def chunked(iterable: List, size: int) -> Iterable[List]:
    if size <= 0:
        yield iterable
        return
    for i in range(0, len(iterable), size):
        yield iterable[i:i+size]

# ------------------ ROUTES ------------------
@app.route("/health")
def health():
    return jsonify({"status": "ok", "time": datetime.now().isoformat(), "env": Config.ENVIRONMENT})

@app.route("/")
def root():
    return jsonify({"message": "Ranking Checker API (unlimited) is running"})

# ---- SESSION SAVE ----
@app.route("/api/stream/save", methods=["POST"])
def save():
    form = request.form.to_dict(flat=True)
    for f in ("keywords", "domains", "device", "location"):
        if not form.get(f):
            return jsonify({"error": f"Missing field: {f}"}), 400

    kws_all = [s.strip() for s in form["keywords"].splitlines() if s.strip()]
    doms_all = [s.strip() for s in form["domains"].splitlines() if s.strip()]
    if not kws_all or not doms_all:
        return jsonify({"error": "Empty input"}), 400

    bad_kw = [k for k in kws_all if not validate_keyword(k)]
    if bad_kw:
        return jsonify({"error": f"Keyword không hợp lệ (ví dụ): {bad_kw[0][:50]}"}), 400
    bad_dm = [d for d in doms_all if not validate_domain_like(d)]
    if bad_dm:
        return jsonify({"error": f"Domain không hợp lệ (ví dụ): {bad_dm[0][:50]}"}), 400

    sid = f"session_{secrets.token_urlsafe(8)}_{int(time.time())}"
    SESSIONS[sid] = form
    return jsonify({"session_id": sid})

# ---- STREAM ----
@app.route("/api/stream")
def stream():
    @stream_with_context
    def gen():
        sid = request.args.get("session_id", "").strip()
        if not sid or sid not in SESSIONS:
            yield 'data: {"error":"Invalid session"}\n\n'
            yield "event: end\ndata: done\n\n"
            return

        form = SESSIONS.get(sid) or {}
        device = form.get("device", "desktop")
        location = form.get("location", "vn")

        kws = [s.strip() for s in unquote_plus(form.get("keywords","")).splitlines() if s.strip()]
        doms = [s.strip() for s in unquote_plus(form.get("domains","")).splitlines() if s.strip()]
        pairs = list(zip(kws, doms))

        try:
            with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as ex:
                for batch in chunked(pairs, Config.CHUNK_SIZE):
                    futs = [ex.submit(process_pair, k, d, location, device) for k, d in batch]
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

        yield "event: end\ndata: done\n\n"

    return Response(gen(), mimetype="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    })

# ------------------ TEMPLATE CRUD ------------------
@app.route("/api/templates", methods=["GET"])
def get_templates():
    templates = Template.query.order_by(Template.created_at.desc()).all()
    return jsonify([
        {
            "id": t.id,
            "user_name": t.user_name,
            "name": t.name,
            "keywords": t.keywords.split("\n"),
            "domains": t.domains.split("\n"),
            "created_at": t.created_at.isoformat()
        } for t in templates
    ])

@app.route("/api/templates", methods=["POST"])
def create_template():
    data = request.json
    if not data.get("user_name") or not data.get("name"):
        return jsonify({"error": "Thiếu user_name hoặc name"}), 400
    
    template = Template(
        user_name=data["user_name"],
        name=data["name"],
        keywords="\n".join(data.get("keywords", [])),
        domains="\n".join(data.get("domains", [])),
    )
    db.session.add(template)
    db.session.commit()
    return jsonify({"message": "Tạo template thành công", "id": template.id})

@app.route("/api/templates/<int:template_id>", methods=["PUT"])
def update_template(template_id):
    data = request.json
    template = Template.query.get_or_404(template_id)
    template.name = data.get("name", template.name)
    template.keywords = "\n".join(data.get("keywords", []))
    template.domains = "\n".join(data.get("domains", []))
    db.session.commit()
    return jsonify({"message": "Cập nhật thành công"})

@app.route("/api/templates/<int:template_id>", methods=["DELETE"])
def delete_template(template_id):
    template = Template.query.get_or_404(template_id)
    db.session.delete(template)
    db.session.commit()
    return jsonify({"message": "Đã xóa template"})

# ------------------ TEST ENDPOINT ------------------
@app.route("/api/test/serper", methods=["GET"])
def test_serper():
    """Test endpoint để kiểm tra Serper API trả về bao nhiêu results"""
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
                    if h.startswith("www."): h = h[4:]
                    if ":" in h: h = h.split(":")[0]

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

# ------------------ TRACKING ENDPOINTS ------------------
@app.route("/api/tracking", methods=["GET"])
def get_tracking_list():
    """Get all tracked keywords"""
    trackings = KeywordTracking.query.filter_by(is_active=True).order_by(KeywordTracking.created_at.desc()).all()
    return jsonify([t.to_dict() for t in trackings])

@app.route("/api/tracking", methods=["POST"])
def add_tracking():
    """Add keyword to tracking list"""
    data = request.json
    user_name = data.get("user_name", "").strip()
    keyword = data.get("keyword", "").strip()
    domain = data.get("domain", "").strip()
    location = data.get("location", "vn")
    device = data.get("device", "desktop")
    frequency = data.get("frequency", "daily")

    if not keyword or not domain:
        return jsonify({"error": "Keyword and domain are required"}), 400

    # Normalize domain
    normalized_domain = normalize_host(domain)
    if not normalized_domain:
        return jsonify({"error": "Invalid domain"}), 400

    # Check if already exists
    existing = KeywordTracking.query.filter_by(
        keyword=keyword,
        domain=normalized_domain,
        is_active=True
    ).first()

    if existing:
        return jsonify({"error": "This keyword-domain pair is already being tracked"}), 400

    # Calculate next check date (11:00 AM VN time tomorrow)
    from datetime import timezone
    vn_tz = timezone(timedelta(hours=7))  # UTC+7 for Vietnam
    now_vn = datetime.now(vn_tz)
    next_check = now_vn.replace(hour=11, minute=0, second=0, microsecond=0)
    if now_vn.hour >= 11:  # If past 11 AM, schedule for tomorrow
        next_check += timedelta(days=1)

    tracking = KeywordTracking(
        user_name=user_name or None,
        keyword=keyword,
        domain=normalized_domain,
        location=location,
        device=device,
        frequency=frequency,
        next_check_date=next_check.replace(tzinfo=None)  # Store as naive datetime
    )

    db.session.add(tracking)
    db.session.commit()

    return jsonify({"message": "Added to tracking", "id": tracking.id, "tracking": tracking.to_dict()})

@app.route("/api/tracking/<int:tracking_id>", methods=["DELETE"])
def delete_tracking(tracking_id):
    """Remove keyword from tracking"""
    tracking = KeywordTracking.query.get_or_404(tracking_id)
    tracking.is_active = False  # Soft delete
    db.session.commit()
    return jsonify({"message": "Removed from tracking"})

@app.route("/api/tracking/<int:tracking_id>/check", methods=["POST"])
def manual_check_tracking(tracking_id):
    """Manually trigger check for a tracked keyword"""
    tracking = KeywordTracking.query.get_or_404(tracking_id)

    # Perform the check using existing process_pair logic
    # Note: process_pair() already saves to rank_history internally
    result = process_pair(
        tracking.keyword,
        tracking.domain,
        tracking.location,
        tracking.device
    )

    # Update last_checked_at and ranking_domain
    tracking.last_checked_at = datetime.utcnow()

    # Extract ranking domain from the actual ranking host (not redirect chain)
    if result.get("ranking_host"):
        tracking.ranking_domain = result["ranking_host"]
    elif result.get("redirect_chain") and len(result["redirect_chain"]) > 0:
        tracking.ranking_domain = result["redirect_chain"][-1]  # Fallback to last in chain
    else:
        tracking.ranking_domain = tracking.domain  # Fallback to original domain

    db.session.commit()

    return jsonify({"message": "Check completed", "result": result})

@app.route("/api/tracking/history", methods=["GET"])
def get_tracking_history():
    """Get historical ranking data for a keyword-domain pair"""
    keyword = request.args.get("keyword")
    domain = request.args.get("domain")
    days = int(request.args.get("days", 30))

    if not keyword or not domain:
        return jsonify({"error": "keyword and domain parameters are required"}), 400

    # Normalize domain
    normalized_domain = normalize_host(domain)
    if not normalized_domain:
        return jsonify({"error": "Invalid domain"}), 400

    # Get history from last N days
    since_date = datetime.utcnow() - timedelta(days=days)

    history = RankHistory.query.filter(
        RankHistory.keyword == keyword,
        RankHistory.domain == normalized_domain,
        RankHistory.checked_at >= since_date
    ).order_by(RankHistory.checked_at.asc()).all()

    # Location display mapping
    location_map = {
        "vn": "Việt Nam",
        "hochiminh": "TP. Hồ Chí Minh",
        "hanoi": "Hà Nội",
        "danang": "Đà Nẵng"
    }

    return jsonify([{
        "keyword": h.keyword,
        "domain": h.domain,
        "position": h.position,
        "url": h.url,
        "checked_at": h.checked_at.isoformat() if h.checked_at else None,
        "location_display": location_map.get(h.location, h.location)
    } for h in history])

@app.route("/api/tracking/monthly/<int:year>/<int:month>", methods=["GET"])
def get_monthly_snapshot(year, month):
    """Get monthly snapshot for all trackings"""
    if month < 1 or month > 12:
        return jsonify({"error": "Invalid month"}), 400

    snapshots = MonthlySnapshot.query.filter_by(year=year, month=month).all()

    return jsonify([s.to_dict() for s in snapshots])

# ------------------ MONTHLY SNAPSHOT CREATION ------------------
def create_monthly_snapshots():
    """
    Create snapshots for all trackings for the previous month.
    Runs on the 1st day of each month at 00:05 AM.
    """
    logger.info("📸 Creating monthly snapshots...")

    with app.app_context():
        try:
            vn_tz = pytz.timezone('Asia/Ho_Chi_Minh')
            now_vn = datetime.now(vn_tz)

            # Get previous month
            if now_vn.month == 1:
                prev_year = now_vn.year - 1
                prev_month = 12
            else:
                prev_year = now_vn.year
                prev_month = now_vn.month - 1

            # Get all active trackings
            trackings = KeywordTracking.query.filter_by(is_active=True).all()
            logger.info(f"📋 Creating snapshots for {len(trackings)} trackings for {prev_year}/{prev_month}")

            created_count = 0

            for tracking in trackings:
                try:
                    # Check if snapshot already exists
                    existing = MonthlySnapshot.query.filter_by(
                        year=prev_year,
                        month=prev_month,
                        keyword=tracking.keyword,
                        domain=tracking.domain
                    ).first()

                    if existing:
                        logger.info(f"⏭️  Snapshot already exists: {tracking.keyword} | {tracking.domain}")
                        continue

                    # Get all history for previous month
                    from calendar import monthrange
                    days_in_month = monthrange(prev_year, prev_month)[1]

                    start_date = datetime(prev_year, prev_month, 1)
                    end_date = datetime(prev_year, prev_month, days_in_month, 23, 59, 59)

                    history = RankHistory.query.filter(
                        RankHistory.keyword == tracking.keyword,
                        RankHistory.domain == tracking.domain,
                        RankHistory.checked_at >= start_date,
                        RankHistory.checked_at <= end_date
                    ).order_by(RankHistory.checked_at.asc()).all()

                    if not history:
                        logger.info(f"⚠️  No history data for {tracking.keyword} | {tracking.domain} in {prev_year}/{prev_month}")
                        continue

                    # Build daily data array
                    daily_data = []
                    for h in history:
                        daily_data.append({
                            "date": h.checked_at.strftime("%Y-%m-%d"),
                            "position": h.position
                        })

                    # Create snapshot
                    snapshot = MonthlySnapshot.create_snapshot(
                        prev_year,
                        prev_month,
                        tracking.keyword,
                        tracking.domain,
                        daily_data
                    )

                    db.session.add(snapshot)
                    created_count += 1
                    logger.info(f"✅ Created snapshot: {tracking.keyword} | {tracking.domain} ({len(daily_data)} days)")

                except Exception as e:
                    logger.error(f"❌ Failed to create snapshot for {tracking.keyword} | {tracking.domain}: {e}")
                    db.session.rollback()

            db.session.commit()
            logger.info(f"🎉 Monthly snapshot creation completed: {created_count} snapshots created")

        except Exception as e:
            logger.error(f"❌ Monthly snapshot job error: {e}")

# ------------------ CRON JOB: AUTO-CHECK TRACKING ------------------
def auto_check_trackings():
    """
    Background job to automatically check all active trackings.
    Runs daily at 11:00 AM Vietnam time.
    """
    logger.info("🕐 Auto-check job started")

    with app.app_context():
        try:
            # Get Vietnam timezone
            vn_tz = pytz.timezone('Asia/Ho_Chi_Minh')
            now_vn = datetime.now(vn_tz)

            # Find all trackings that are due for checking
            # next_check_date is stored as naive datetime (UTC), so we compare with UTC time
            now_utc = datetime.utcnow()

            trackings = KeywordTracking.query.filter(
                KeywordTracking.is_active == True,
                KeywordTracking.next_check_date <= now_utc
            ).all()

            logger.info(f"📋 Found {len(trackings)} trackings to check")

            checked_count = 0
            failed_count = 0
    
            

                

            for tracking in trackings:
                try:
                    logger.info(f"🔍 Checking: {tracking.keyword} | {tracking.domain}")

                    # Perform the ranking check
                    result = process_pair(
                        tracking.keyword,
                        tracking.domain,
                        tracking.location,
                        tracking.device
                    )

                    # Update tracking record
                    tracking.last_checked_at = now_utc

                    # Update ranking domain from the actual ranking host (not redirect chain)
                    if result.get("ranking_host"):
                        tracking.ranking_domain = result["ranking_host"]
                    elif result.get("redirect_chain") and len(result["redirect_chain"]) > 0:
                        tracking.ranking_domain = result["redirect_chain"][-1]
                    else:
                        tracking.ranking_domain = tracking.domain

                    # Calculate next check date based on frequency
                    if tracking.frequency == "daily":
                        next_check = now_vn.replace(hour=11, minute=0, second=0, microsecond=0) + timedelta(days=1)
                    elif tracking.frequency == "every_3_days":
                        next_check = now_vn.replace(hour=11, minute=0, second=0, microsecond=0) + timedelta(days=3)
                    elif tracking.frequency == "weekly":
                        next_check = now_vn.replace(hour=11, minute=0, second=0, microsecond=0) + timedelta(days=7)
                    else:
                        next_check = now_vn.replace(hour=11, minute=0, second=0, microsecond=0) + timedelta(days=1)

                    tracking.next_check_date = next_check.astimezone(pytz.UTC).replace(tzinfo=None)

                    db.session.commit()
                    checked_count += 1

                    logger.info(f"✅ Success: {tracking.keyword} | Position: {result.get('position', 'N/A')}")

                except Exception as e:
                    failed_count += 1
                    logger.error(f"❌ Auto-check failed for {tracking.keyword} | {tracking.domain}: {e}")
                    db.session.rollback()

            logger.info(f"🎉 Auto-check completed: {checked_count} succeeded, {failed_count} failed")

        except Exception as e:
            logger.error(f"❌ Auto-check job error: {e}")

# Initialize scheduler
scheduler = BackgroundScheduler(timezone=pytz.timezone('Asia/Ho_Chi_Minh'))

# Daily ranking check at 11:00 AM
scheduler.add_job(
    func=auto_check_trackings,
    trigger='cron',
    hour=11,
    minute=0,
    id='auto_check_trackings',
    name='Auto-check tracked keywords daily at 11:00 AM VN time',
    replace_existing=True
)

# Monthly snapshot creation on 1st day of month at 00:05 AM
scheduler.add_job(
    func=create_monthly_snapshots,
    trigger='cron',
    day=1,
    hour=0,
    minute=5,
    id='create_monthly_snapshots',
    name='Create monthly snapshots on 1st day of each month',
    replace_existing=True
)

# ------------------ MAIN ------------------
if __name__ == "__main__":
    print(f"🔑 API Key: {'✅ Set' if Config.SERPER_API_KEY else '❌ Missing'}")

    # Start scheduler
    try:
        scheduler.start()
        logger.info("⏰ Scheduler started - Auto-check will run daily at 11:00 AM Vietnam time")
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {e}")

    try:
        app.run(host="0.0.0.0", port=8001, debug=False, threaded=True)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("🛑 Scheduler stopped")