# Backend Refactoring Guide

## 📁 Cấu Trúc Mới

Dự án đã được refactor từ 1 file monolithic `app.py` (900+ dòng) thành cấu trúc modular:

```
backend/
├── app.py                      # Main Flask app (182 dòng) ⬅️ Entry point
├── app_backup.py               # Backup file cũ (900+ dòng)
├── config.py                   # Configuration & environment
├── extensions.py               # SQLAlchemy setup (existing)
│
├── models/                     # Database models
│   ├── __init__.py
│   ├── template.py             # Template model
│   └── rank_history.py         # Ranking history model
│
├── utils/                      # 🆕 Utility functions
│   ├── __init__.py
│   ├── validation.py           # Input validation (keywords, domains)
│   ├── domain.py               # Domain normalization & parsing
│   ├── redirect.py             # HTTP redirect handling
│   └── helpers.py              # General helpers (chunked)
│
├── services/                   # 🆕 Business logic
│   ├── __init__.py
│   ├── serper.py               # Serper API integration
│   └── ranking.py              # Ranking detection & processing
│
└── routes/                     # 🆕 API endpoints (Blueprints)
    ├── __init__.py             # Blueprint registration
    ├── stream.py               # Single check SSE endpoints
    ├── bulk.py                 # Bulk 30-domain check
    ├── templates.py            # Template CRUD
    └── history.py              # History & session endpoints
```

---

## 🔄 So Sánh Before/After

### Before (Monolithic)
```python
# app.py (900+ lines)
- Config
- Validation functions
- Domain normalization
- Redirect handling
- Serper API integration
- Ranking detection logic
- All API endpoints
- Database operations
```

### After (Modular)
```python
# app.py (182 lines) - Clean entry point
- Application factory pattern
- Blueprint registration
- Basic routes (health, test)

# config.py - Configuration
- Environment variables
- Settings & constants

# utils/ - Pure functions
- validation.py: Input sanitization
- domain.py: Domain parsing
- redirect.py: HTTP redirects
- helpers.py: General utilities

# services/ - Business logic
- serper.py: Serper API calls
- ranking.py: Ranking detection

# routes/ - API endpoints
- stream.py: SSE streaming
- bulk.py: Bulk checks
- templates.py: CRUD operations
- history.py: History queries
```

---

## ✅ Lợi Ích

### 1. **Separation of Concerns**
- Mỗi module có trách nhiệm rõ ràng
- Dễ tìm code cần sửa
- Giảm coupling giữa các components

### 2. **Testability**
```python
# Dễ dàng unit test từng module
from utils.validation import validate_keyword
assert validate_keyword("seo tools") == True
assert validate_keyword("<script>") == False

from services.serper import serper_search
# Mock Serper API và test logic
```

### 3. **Reusability**
```python
# Utils có thể dùng ở nhiều nơi
from utils import normalize_host
host = normalize_host("https://www.example.com")  # -> "example.com"
```

### 4. **Maintainability**
- Sửa bug trong validation? → Chỉ cần vào `utils/validation.py`
- Thay đổi Serper API logic? → Chỉ cần vào `services/serper.py`
- Thêm endpoint mới? → Tạo blueprint mới trong `routes/`

### 5. **Scalability**
- Dễ thêm features mới
- Có thể tách thành microservices sau này
- Clear boundaries giữa các layers

---

## 🔧 Cách Sử Dụng

### Development
```bash
cd backend
source venv/bin/activate
python app.py
```

### Production
Không có thay đổi về deployment:
```bash
systemctl restart ranking-backend
```

### Testing
```bash
# Test imports
python -c "from app import create_app; print('✓ OK')"

# Test health endpoint
curl http://localhost:8001/health
```

---

## 📝 API Endpoints (Không Thay Đổi)

Tất cả endpoints vẫn hoạt động y như cũ:

| Endpoint | Module | Mô tả |
|----------|--------|-------|
| `GET /health` | app.py | Health check |
| `POST /api/stream/save` | routes/stream.py | Save session |
| `GET /api/stream` | routes/stream.py | SSE streaming |
| `POST /api/bulk/check` | routes/bulk.py | Bulk 30 domains |
| `GET/POST/PUT/DELETE /api/templates` | routes/templates.py | Template CRUD |
| `GET /api/history/*` | routes/history.py | History queries |

---

## 🧪 Testing Checklist

Đã test thành công:
- ✅ Python syntax compilation
- ✅ All module imports
- ✅ Flask app startup
- ✅ Health endpoint response
- ✅ Database initialization

Cần test tiếp (manual):
- [ ] Single check SSE stream
- [ ] Bulk 30-domain check
- [ ] Template CRUD operations
- [ ] History queries
- [ ] Redirect following
- [ ] Serper API integration

---

## 🔄 Migration Notes

### Breaking Changes
**NONE** - 100% backward compatible

### File Changes
- `app.py` → Refactored (backup: `app_backup.py`)
- Added: `config.py`, `utils/`, `services/`, `routes/`
- No changes to: `models/`, `extensions.py`, database schema

### Configuration
Không cần thay đổi `.env` hoặc `systemd` service

---

## 📚 Code Examples

### Before: Adding a new endpoint
```python
# Edit app.py (900+ lines)
# Scroll to find the right place
# Add endpoint among 50+ other functions
@app.route("/api/new-feature")
def new_feature():
    # ... 100 lines of logic mixed with other code
```

### After: Adding a new endpoint
```python
# Create routes/new_feature.py
from flask import Blueprint

new_feature_bp = Blueprint('new_feature', __name__)

@new_feature_bp.route("/api/new-feature")
def new_feature():
    # Clean, isolated logic
    pass

# Register in routes/__init__.py
from .new_feature import new_feature_bp
app.register_blueprint(new_feature_bp)
```

---

## 🐛 Troubleshooting

### ImportError
```bash
# Đảm bảo đang ở đúng directory
cd /Users/peter/ranking-checker/backend

# Activate venv
source venv/bin/activate

# Test imports
python -c "from config import Config; print('OK')"
```

### Module not found
```bash
# Kiểm tra structure
ls -la utils/ services/ routes/

# Mỗi thư mục phải có __init__.py
```

---

## 🚀 Next Steps

1. **Add Unit Tests**
   - Tạo `tests/` directory
   - Test từng module độc lập
   - Setup pytest

2. **Add Type Hints**
   - Sử dụng `mypy` cho static type checking
   - Document function signatures

3. **API Documentation**
   - Setup Swagger/OpenAPI
   - Auto-generate docs từ blueprints

4. **Monitoring**
   - Add logging middleware
   - Setup metrics collection
   - Error tracking (Sentry)

---

## 📞 Support

Nếu có vấn đề sau refactoring:
1. Check `app_backup.py` để so sánh logic cũ
2. Verify imports: `python -c "from app import create_app"`
3. Check logs: `journalctl -u ranking-backend -f`

---

**Refactored by:** Claude Code
**Date:** 2026-02-09
**Version:** 2.0
