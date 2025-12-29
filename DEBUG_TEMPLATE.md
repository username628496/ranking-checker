# 🔧 DEBUG GUIDE: Template Cá Nhân Không Hoạt Động

## Vấn Đề

Template cá nhân không hoạt động:
- Không tạo được template mới
- Không sửa được template
- Không xóa được template
- Không load được danh sách template

## Các Bước Debug

### 1. Kiểm tra Backend đang chạy

```bash
# Kiểm tra backend có chạy không
curl http://localhost:8001/health

# Hoặc trên VPS production
curl https://ranking.aeseo1.org/health

# Kết quả mong đợi:
# {"status": "ok", "time": "2025-...", "env": "production"}
```

### 2. Kiểm tra Database

```bash
cd /var/www/ranking-checker/backend

# Kiểm tra file database có tồn tại không
ls -la instance/templates.db

# Kiểm tra bảng templates
sqlite3 instance/templates.db "SELECT * FROM templates;"

# Kiểm tra schema
sqlite3 instance/templates.db ".schema templates"
```

**Schema mong đợi:**
```sql
CREATE TABLE templates (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    user_name VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    keywords TEXT NOT NULL,
    domains TEXT NOT NULL,
    created_at DATETIME
);
```

### 3. Test Template API trực tiếp

Sử dụng script test:

```bash
# Local
./test-template-api.sh http://localhost:8001

# Production
./test-template-api.sh https://ranking.aeseo1.org
```

Hoặc test thủ công:

```bash
# Test GET templates
curl https://ranking.aeseo1.org/api/templates

# Test POST (tạo mới)
curl -X POST https://ranking.aeseo1.org/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "Peter",
    "name": "Test Template",
    "keywords": ["seo tools", "keyword tool"],
    "domains": ["example.com"]
  }'

# Test PUT (cập nhật) - thay <ID> bằng ID thật
curl -X PUT https://ranking.aeseo1.org/api/templates/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "keywords": ["new keyword"],
    "domains": ["newdomain.com"]
  }'

# Test DELETE - thay <ID> bằng ID thật
curl -X DELETE https://ranking.aeseo1.org/api/templates/1
```

### 4. Kiểm tra CORS

Nếu API hoạt động nhưng frontend không gọi được, có thể là lỗi CORS:

```bash
# Kiểm tra CORS header
curl -I -X OPTIONS https://ranking.aeseo1.org/api/templates \
  -H "Origin: https://ranking.aeseo1.org" \
  -H "Access-Control-Request-Method: POST"

# Kết quả mong đợi có header:
# Access-Control-Allow-Origin: https://ranking.aeseo1.org
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

Nếu CORS fail, kiểm tra `backend/app.py` dòng 66-79:

```python
if Config.ENVIRONMENT == "production":
    CORS(app, resources={
        r"/*": {
            "origins": [
                "https://ranking.aeseo1.org",  # Phải đúng domain
                "http://ranking.aeseo1.org"
            ],
            ...
        }
    })
```

### 5. Kiểm tra Browser Console

Mở DevTools (F12) trong browser và check:

**Console Tab:**
- Có lỗi JavaScript không?
- Có lỗi API call không? (404, 500, CORS)
- API URL có đúng không?

**Network Tab:**
- Filter: XHR
- Tìm các request tới `/api/templates`
- Kiểm tra Status Code:
  - 200 OK: Thành công
  - 404 Not Found: API endpoint không tồn tại
  - 500 Internal Server Error: Lỗi backend
  - CORS error: Lỗi CORS

**Request Details:**
- Headers: Content-Type phải là `application/json`
- Payload: Data gửi lên có đúng format không?
- Response: Backend trả về gì?

### 6. Kiểm tra Backend Logs

```bash
# Systemd logs
sudo journalctl -u ranking-backend -f

# Custom log files (nếu có)
sudo tail -f /var/log/ranking-checker/backend.log
sudo tail -f /var/log/ranking-checker/backend-error.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

Tìm các dòng log khi call API templates:
- Request method và path
- Response status code
- Error messages (nếu có)

### 7. Test Frontend API File

Kiểm tra file `frontend/src/api.ts`:

```typescript
// Đảm bảo API_BASE đúng
const API_BASE = import.meta.env.PROD
  ? "https://ranking.aeseo1.org/api"  // Production
  : "http://localhost:8001/api";      // Development
```

Rebuild frontend:

```bash
cd /var/www/ranking-checker/frontend
npm run build
sudo systemctl reload nginx
```

### 8. Kiểm tra Environment Variables

```bash
cd /var/www/ranking-checker

# Check .env.production
cat .env.production

# Đảm bảo có:
ENVIRONMENT=production
SERPER_API_KEY=your_actual_key_here
SECRET_KEY=your_secret_key_here
```

## Các Lỗi Thường Gặp

### ❌ Lỗi: 404 Not Found

**Nguyên nhân:**
- Nginx chưa proxy đúng `/api/templates`
- Backend chưa chạy
- Route không đúng

**Giải pháp:**
```bash
# Kiểm tra Nginx config
sudo nginx -t

# Kiểm tra backend status
sudo systemctl status ranking-backend

# Restart cả 2
sudo systemctl restart ranking-backend
sudo systemctl reload nginx
```

### ❌ Lỗi: 500 Internal Server Error

**Nguyên nhân:**
- Database không tồn tại hoặc schema sai
- Backend code có bug
- Environment variables thiếu

**Giải pháp:**
```bash
# Xem backend logs để biết lỗi cụ thể
sudo journalctl -u ranking-backend -n 100

# Recreate database nếu cần
cd /var/www/ranking-checker/backend
source venv/bin/activate
python -c "from app import app, db; app.app_context().push(); db.create_all(); print('✅ Database created')"
```

### ❌ Lỗi: CORS

**Nguyên nhân:**
- Domain không được whitelist trong backend
- Nginx không forward headers đúng

**Giải pháp:**

1. Check backend CORS config (backend/app.py):
```python
"origins": [
    "https://ranking.aeseo1.org",  # Phải khớp với domain truy cập
    "http://ranking.aeseo1.org"
]
```

2. Check Nginx proxy headers (nginx.conf):
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### ❌ Frontend không gọi API

**Nguyên nhân:**
- Build frontend với API_BASE sai
- Cache browser cũ
- JavaScript error

**Giải pháp:**
```bash
# Rebuild frontend
cd /var/www/ranking-checker/frontend
npm run build

# Clear browser cache
# Hoặc hard refresh: Ctrl+Shift+R / Cmd+Shift+R

# Check console for JS errors
```

### ❌ Template tạo được nhưng không hiện

**Nguyên nhân:**
- Frontend không reload sau khi tạo
- Lỗi parse response
- API return format sai

**Giải pháp:**

Check backend response format phải đúng:

```python
# GET /api/templates
[
    {
        "id": 1,
        "user_name": "Peter",
        "name": "My Template",
        "keywords": ["keyword1", "keyword2"],  # Array, không phải string
        "domains": ["domain.com"],             # Array, không phải string
        "created_at": "2025-12-26T10:00:00"
    }
]
```

## Quick Fix Commands

```bash
# Full restart production
cd /var/www/ranking-checker

# Pull latest code
git pull origin main

# Rebuild frontend
cd frontend
npm install
npm run build

# Restart backend
sudo systemctl restart ranking-backend

# Reload nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status ranking-backend
curl https://ranking.aeseo1.org/health
curl https://ranking.aeseo1.org/api/templates
```

## Support

Nếu vẫn không được, gửi các thông tin sau:

1. Backend logs: `sudo journalctl -u ranking-backend -n 100`
2. Browser console errors (screenshot)
3. Network tab request/response (screenshot)
4. Output của: `curl https://ranking.aeseo1.org/api/templates`
