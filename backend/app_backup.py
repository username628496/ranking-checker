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
from models.rank_history import RankHistory
from sqlalchemy import func

# ------------------ ENV & CONFIG ------------------
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("Environment loaded")
except Exception:
    print("python-dotenv not found")

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
print(f"Using database at: {app.config['SQLALCHEMY_DATABASE_URI']}")  # thêm dòng này

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
def serper_search(keyword: str, location: str, device: str, max_results: int = 30) -> List[Dict]:
    """
    Tìm kiếm qua Serper API và lấy tối đa max_results kết quả.
    Serper API returns max 10 results per call, so we paginate to get 30.
    """
    if not Config.SERPER_API_KEY:
        raise ValueError("SERPER_API_KEY not configured")

    all_results = []
    results_per_page = 10
    max_pages = min(5, (max_results + results_per_page - 1) // results_per_page)  # Ceiling division

    try:
        for page in range(max_pages):
            start = page * results_per_page

            payload = {
                "q": keyword[:100],
                "gl": location,
                "hl": "vi",
                "device": device,
                "num": results_per_page,
                "page": page + 1,  # Serper uses 1-indexed pages
                "autocorrect": False,
            }

            logger.info(f"Serper search: {keyword} | page={page+1} | positions {start+1}-{start+results_per_page} | location={location}")

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
                break

            organic = data.get("organic", [])

            if not organic:
                logger.info(f"Serper page {page+1}: No results found, stopping pagination")
                break

            # Add actual position to each result
            for idx, item in enumerate(organic):
                item['actualPosition'] = start + idx + 1

            all_results.extend(organic)
            logger.info(f"Serper page {page+1}: Found {len(organic)} results (total: {len(all_results)})")

            # Stop if we have enough results
            if len(all_results) >= max_results:
                logger.info(f"Reached {len(all_results)} results (≥{max_results}), stopping pagination")
                break

            # Add delay between requests to avoid rate limiting
            if page < max_pages - 1 and len(organic) > 0:
                time.sleep(0.5)

        logger.info(f"Serper total: {len(all_results)} results for '{keyword}'")
        return all_results[:max_results]

    except Exception as e:
        logger.error(f"Serper search failed for '{keyword}': {e}")
        return all_results[:max_results] if all_results else []

# ------------------ CORE: PROCESS ONE PAIR ------------------
def process_pair(keyword: str, domain_input: str, location: str, device: str, session_id: str = None, check_type: str = "single") -> Dict:
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

        # Gọi Serper API để tìm vị trí (lấy 30 results with pagination)
        organic = serper_search(keyword, location, device, max_results=30)

        # Log target domain info
        logger.info(f"Searching for: {keyword} | Target: {final_host} | Chain: {chain_hosts}")

        matched = False
        ranking_host = None  # Store the actual ranking host

        for idx, item in enumerate(organic):
            link = item.get("link", "")
            if not link:
                continue

            # Use actualPosition from pagination if available
            actual_position = item.get("actualPosition", idx + 1)

            try:
                h = urlparse(link).netloc.lower()
                if h.startswith("www."): h = h[4:]
                if ":" in h: h = h.split(":")[0]
            except Exception:
                h = ""

            # Log first 30 results for debugging
            if idx < 30:
                logger.debug(f"  [#{actual_position}] Checking: {h} | URL: {link[:100]}")

            # EXACT host match only - no partial matching!
            # Compare: user input domain vs SERP result domain
            if h and (h == final_host or h in chain_hosts):
                out["position"] = actual_position
                out["url"] = link[:200]
                ranking_host = h
                matched = True
                logger.info(f"✅ Found exact match: {keyword} | {h} == {final_host} at position #{actual_position}")
                break

            # Only for top 10: follow redirect to check final destination
            # This handles cases where Google shows a redirect URL
            if idx < 10:
                try:
                    fh = final_host_of_url(link)
                    if fh:
                        logger.debug(f"  [#{actual_position}] After redirect: {fh}")
                    # Check if redirect destination matches our target
                    if fh and (fh == final_host or fh in chain_hosts):
                        out["position"] = actual_position
                        out["url"] = link[:200]
                        ranking_host = h  # Save the SERP host (not redirect destination)
                        matched = True
                        logger.info(f"✅ Found match via redirect: {keyword} | {h} → {fh} at position #{actual_position}")
                        break
                except Exception as e:
                    logger.debug(f"  [#{actual_position}] Redirect check failed: {e}")
                    continue

        # Add ranking_host to output
        if ranking_host:
            out["ranking_host"] = ranking_host

        if not matched:
            out["position"] = "N/A"
            out["url"] = "-"
            logger.warning(f"❌ No match found: {keyword} | Target: {final_host} | Chain: {chain_hosts} | Checked {len(organic)} results")

    except Exception as e:
        logger.warning(f"process_pair error: {keyword} | {domain_input} | {e}")
        out["error"] = "Processing failed"

    # Ghi lịch sử vào DB (với context Flask)
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
                session_id=session_id,
                check_type=check_type
            )

            db.session.add(history)
            db.session.commit()
            logger.info(f"Lưu lịch sử: {keyword} | {domain_input} | {pos}")
    except Exception as e:
        logger.warning(f"Không thể lưu lịch sử: {e}")

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
                    futs = [ex.submit(process_pair, k, d, location, device, sid, "single") for k, d in batch]
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
            "keywords": [k.strip() for k in t.keywords.split("\n") if k.strip()],
            "domains": [d.strip() for d in t.domains.split("\n") if d.strip()],
            "created_at": t.created_at.isoformat() if t.created_at else None
        } for t in templates
    ])

@app.route("/api/templates", methods=["POST"])
def create_template():
    data = request.json
    if not data.get("user_name") or not data.get("name"):
        return jsonify({"error": "Thiếu user_name hoặc name"}), 400

    # Filter out empty strings from keywords and domains
    keywords = [k.strip() for k in data.get("keywords", []) if k.strip()]
    domains = [d.strip() for d in data.get("domains", []) if d.strip()]

    template = Template(
        user_name=data["user_name"].strip(),
        name=data["name"].strip(),
        keywords="\n".join(keywords),
        domains="\n".join(domains),
    )
    db.session.add(template)
    db.session.commit()

    # Return the created template with full data
    return jsonify({
        "message": "Tạo template thành công",
        "id": template.id,
        "template": {
            "id": template.id,
            "user_name": template.user_name,
            "name": template.name,
            "keywords": keywords,
            "domains": domains,
            "created_at": template.created_at.isoformat() if template.created_at else None
        }
    }), 201

@app.route("/api/templates/<int:template_id>", methods=["PUT"])
def update_template(template_id):
    data = request.json
    template = Template.query.get_or_404(template_id)

    # Update fields if provided
    if "name" in data:
        template.name = data["name"].strip()

    if "keywords" in data:
        keywords = [k.strip() for k in data.get("keywords", []) if k.strip()]
        template.keywords = "\n".join(keywords)

    if "domains" in data:
        domains = [d.strip() for d in data.get("domains", []) if d.strip()]
        template.domains = "\n".join(domains)

    db.session.commit()

    # Return updated template data
    return jsonify({
        "message": "Cập nhật thành công",
        "template": {
            "id": template.id,
            "user_name": template.user_name,
            "name": template.name,
            "keywords": [k.strip() for k in template.keywords.split("\n") if k.strip()],
            "domains": [d.strip() for d in template.domains.split("\n") if d.strip()],
            "created_at": template.created_at.isoformat() if template.created_at else None
        }
    })

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
@app.route("/api/bulk/check", methods=["POST"])
def bulk_check():
    """
    Check multiple keywords and return top N domains for each.
    Request: { keywords: [...], location: "vn", device: "desktop", limit: 30 }
    Response: { results: [{ keyword: "...", topDomains: [{position, domain, url, title}, ...] }] }
    """
    data = request.json or {}
    keywords = data.get("keywords", [])
    location = data.get("location", "vn")
    device = data.get("device", "desktop")
    limit = int(data.get("limit", 30))

    if not keywords or not isinstance(keywords, list):
        return jsonify({"error": "keywords must be a non-empty array"}), 400

    if limit < 1 or limit > 100:
        limit = 30

    # Generate session_id for this bulk check
    import uuid
    session_id = str(uuid.uuid4())

    results = []

    try:
        for keyword in keywords:
            if not validate_keyword(keyword):
                continue

            # Get SERP results from Serper - fetch more to ensure we get 30 unique domains
            organic = serper_search(keyword, location, device, max_results=50)

            top_domains = []
            seen_domains = set()

            for item in organic:
                if len(top_domains) >= limit:
                    break

                link = item.get("link", "")
                title = item.get("title", "")
                # Use actualPosition from pagination if available
                actual_position = item.get("actualPosition", item.get("position", 0))

                if not link:
                    continue

                try:
                    parsed = urlparse(link)
                    domain = parsed.netloc.lower()
                    if domain.startswith("www."):
                        domain = domain[4:]
                    if ":" in domain:
                        domain = domain.split(":")[0]

                    # Skip duplicates
                    if domain in seen_domains:
                        continue

                    seen_domains.add(domain)

                    top_domains.append({
                        "position": actual_position,
                        "domain": domain,
                        "url": link,
                        "title": title,
                    })

                except Exception as e:
                    logger.error(f"Error parsing result: {e}")
                    continue

            results.append({
                "keyword": keyword,
                "topDomains": top_domains,
            })

            # Save history for this keyword (top 30 domains)
            try:
                for domain_info in top_domains[:30]:
                    history = RankHistory(
                        keyword=keyword.strip(),
                        domain=domain_info["domain"].strip(),
                        position=domain_info["position"],
                        url=domain_info["url"][:500],
                        location=location,
                        device=device,
                        checked_at=dt.datetime.now(dt.timezone.utc),
                        session_id=session_id,
                        check_type="bulk"
                    )
                    db.session.add(history)
                db.session.commit()
            except Exception as e:
                logger.warning(f"Failed to save bulk history for {keyword}: {e}")
                db.session.rollback()

        return jsonify({"results": results})

    except Exception as e:
        logger.error(f"Bulk check error: {e}")
        return jsonify({"error": str(e)}), 500

# ------------------ HISTORY ENDPOINT ------------------
@app.route("/api/history/all", methods=["GET"])
def get_all_history():
    """
    Get all rank history records
    Supports filtering by keyword, domain, location, device, date range
    """
    keyword = request.args.get("keyword")
    domain = request.args.get("domain")
    location = request.args.get("location")
    device = request.args.get("device")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    limit = request.args.get("limit", 1000, type=int)

    query = RankHistory.query

    if keyword:
        query = query.filter(RankHistory.keyword.like(f"%{keyword}%"))
    if domain:
        query = query.filter(RankHistory.domain.like(f"%{domain}%"))
    if location:
        query = query.filter_by(location=location)
    if device:
        query = query.filter_by(device=device)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(RankHistory.checked_at >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(RankHistory.checked_at <= end_dt)
        except ValueError:
            pass

    history = query.order_by(RankHistory.checked_at.desc()).limit(limit).all()

    return jsonify({
        "results": [{
            "id": h.id,
            "keyword": h.keyword,
            "domain": h.domain,
            "position": h.position,
            "url": h.url,
            "location": h.location,
            "device": h.device,
            "checked_at": h.checked_at.isoformat() if h.checked_at else None,
        } for h in history]
    })

@app.route("/api/history/sessions", methods=["GET"])
def get_sessions():
    """
    Get unique check sessions grouped by session_id with pagination
    Query params: page (default 1), per_page (default 20)
    Returns: { sessions: [...], total: int, page: int, per_page: int, total_pages: int }
    """
    try:
        # Get pagination parameters
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        # Ensure valid values
        page = max(1, page)
        per_page = min(max(1, per_page), 100)  # Max 100 per page

        # Base query for sessions
        base_query = db.session.query(
            RankHistory.session_id,
            RankHistory.check_type,
            func.min(RankHistory.checked_at).label('checked_at'),
            func.count(func.distinct(RankHistory.keyword)).label('keyword_count'),
            func.count(func.distinct(RankHistory.domain)).label('domain_count'),
            func.count(RankHistory.id).label('total_records'),
            func.sum(RankHistory.api_credits_used).label('api_credits_used'),
            func.sum(db.case((RankHistory.position.isnot(None), 1), else_=0)).label('success_count'),
            RankHistory.location,
            RankHistory.device
        ).filter(
            RankHistory.session_id.isnot(None)
        ).group_by(
            RankHistory.session_id,
            RankHistory.check_type,
            RankHistory.location,
            RankHistory.device
        )

        # Get total count
        total = base_query.count()

        # Get paginated results
        sessions_query = base_query.order_by(
            func.min(RankHistory.checked_at).desc()
        ).limit(per_page).offset((page - 1) * per_page).all()

        sessions = [{
            "session_id": s.session_id,
            "check_type": s.check_type or "single",
            "checked_at": s.checked_at.isoformat() if s.checked_at else None,
            "keyword_count": s.keyword_count,
            "domain_count": s.domain_count,
            "total_records": s.total_records,
            "api_credits_used": s.api_credits_used or 0,
            "success": s.success_count > 0,
            "location": s.location,
            "device": s.device,
        } for s in sessions_query]

        total_pages = (total + per_page - 1) // per_page  # Ceiling division

        return jsonify({
            "sessions": sessions,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        })

    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        return jsonify({"error": str(e)}), 500

# ------------------ MAIN ------------------
if __name__ == "__main__":
    print(f"API Key: {'Set' if Config.SERPER_API_KEY else 'Missing'}")

    app.run(host="0.0.0.0", port=8001, debug=False, threaded=True)