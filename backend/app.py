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

# Import DB & models
from extensions import db
from models import Template

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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ranking-unlimited")

# ------------------ FLASK APP ------------------
app = Flask(__name__)
app.config["SECRET_KEY"] = Config.SECRET_KEY
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///templates.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

CORS(app)
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
def serper_search(keyword: str, location: str, device: str) -> Dict:
    if not Config.SERPER_API_KEY:
        raise ValueError("SERPER_API_KEY not configured")
    payload = {
        "q": keyword[:100],
        "gl": location,
        "hl": "vi",
        "device": device,
        "num": 50,
    }
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
        raise RuntimeError(str(data["error"]))
    return data

# ------------------ CORE: PROCESS ONE PAIR ------------------
def process_pair(keyword: str, domain_input: str, location: str, device: str) -> Dict:
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
        host = normalize_host(domain_input)
        if not host:
            raise ValueError("Invalid domain")

        final_host, chain_hosts = final_host_for_input(host)
        out["redirect_chain"] = chain_hosts[:10]

        data = serper_search(keyword, location, device)
        organic = data.get("organic", [])

        matched = False
        for idx, item in enumerate(organic[:30]):
            link = item.get("link", "")
            if not link:
                continue
            try:
                h = urlparse(link).netloc.lower()
                if h.startswith("www."): h = h[4:]
                if ":" in h: h = h.split(":")[0]
            except Exception:
                h = ""

            if h and (h == final_host or h in chain_hosts):
                out["position"] = item.get("position", "N/A")
                out["url"] = link[:200]
                matched = True
                break

            if idx < 10:  # resolve host cuối cho top 10 để tiết kiệm
                fh = final_host_of_url(link)
                if fh and (fh == final_host or fh in chain_hosts):
                    out["position"] = item.get("position", "N/A")
                    out["url"] = link[:200]
                    matched = True
                    break

        if not matched:
            out["position"] = "N/A"
            out["url"] = "-"

    except Exception as e:
        logger.warning(f"process_pair error: {keyword} | {domain_input} | {e}")
        out["error"] = "Processing failed"
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

# ------------------ MAIN ------------------
if __name__ == "__main__":
    print(f"🔑 API Key: {'✅ Set' if Config.SERPER_API_KEY else '❌ Missing'}")
    app.run(host="0.0.0.0", port=8000, debug=False, threaded=True)