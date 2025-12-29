# 🚀 HƯỚNG DẪN DEPLOY LÊN VPS ranking.aeseo1.org

## 📋 Chuẩn bị VPS

### 1. Cài đặt dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python, Node.js, Nginx
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx certbot python3-certbot-nginx

# Install PM2 hoặc sử dụng systemd (recommend systemd)
# npm install -g pm2  # Optional
```

## 📁 Upload code lên VPS

### 2. Upload project

```bash
# Trên máy local - tạo archive (không bao gồm node_modules, venv, __pycache__)
tar --exclude='node_modules' --exclude='venv' --exclude='__pycache__' --exclude='.git' \
    -czf ranking-checker.tar.gz ranking-checker/

# Upload lên VPS
scp ranking-checker.tar.gz user@your-vps-ip:/tmp/

# Trên VPS - giải nén
cd /var/www
sudo tar -xzf /tmp/ranking-checker.tar.gz
sudo chown -R www-data:www-data ranking-checker
```

## ⚙️ Cấu hình Backend

### 3. Setup Python environment

```bash
cd /var/www/ranking-checker/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Cấu hình environment variables

```bash
cd /var/www/ranking-checker
cp .env.production .env

# Edit .env và thay đổi:
nano .env
```

**Cần thay đổi trong .env:**
```bash
ENVIRONMENT=production
SECRET_KEY=<generate-random-secret-key-here>
SERPER_API_KEY=<your-serper-api-key>
```

### 5. Tạo database

```bash
cd /var/www/ranking-checker/backend
source venv/bin/activate
python -c "from app import app, db; app.app_context().push(); db.create_all(); print('Database created')"
```

### 6. Setup systemd service cho backend

```bash
# Copy service file
sudo cp /var/www/ranking-checker/systemd-backend.service /etc/systemd/system/ranking-backend.service

# Edit service file để đảm bảo đường dẫn đúng
sudo nano /etc/systemd/system/ranking-backend.service

# Create log directory
sudo mkdir -p /var/log/ranking-checker
sudo chown www-data:www-data /var/log/ranking-checker

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable ranking-backend
sudo systemctl start ranking-backend

# Check status
sudo systemctl status ranking-backend

# View logs
sudo journalctl -u ranking-backend -f
```

## 🌐 Cấu hình Frontend

### 7. Build frontend

```bash
cd /var/www/ranking-checker/frontend

# Install dependencies
npm install

# Build for production
npm run build

# Kiểm tra build output
ls -la dist/
```

## 🔒 Cấu hình Nginx & SSL

### 8. Setup SSL certificate

```bash
# Obtain SSL certificate from Let's Encrypt
sudo certbot certonly --nginx -d ranking.aeseo1.org

# Certificate sẽ được lưu tại:
# /etc/letsencrypt/live/ranking.aeseo1.org/fullchain.pem
# /etc/letsencrypt/live/ranking.aeseo1.org/privkey.pem
```

### 9. Cấu hình Nginx

```bash
# Copy nginx config
sudo cp /var/www/ranking-checker/nginx.conf /etc/nginx/sites-available/ranking.aeseo1.org

# Kiểm tra config và update paths nếu cần
sudo nano /etc/nginx/sites-available/ranking.aeseo1.org

# Enable site
sudo ln -s /etc/nginx/sites-available/ranking.aeseo1.org /etc/nginx/sites-enabled/

# Remove default site (nếu có)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## ✅ Kiểm tra deployment

### 10. Test endpoints

```bash
# Test backend health
curl https://ranking.aeseo1.org/health

# Test backend API
curl https://ranking.aeseo1.org/api/templates

# Test frontend
curl https://ranking.aeseo1.org
```

### 11. Open in browser

Truy cập: **https://ranking.aeseo1.org**

## 🔄 Update code sau này

### Cập nhật backend:

```bash
cd /var/www/ranking-checker/backend
sudo systemctl stop ranking-backend
source venv/bin/activate
git pull  # hoặc upload file mới
pip install -r requirements.txt
sudo systemctl start ranking-backend
```

### Cập nhật frontend:

```bash
cd /var/www/ranking-checker/frontend
npm install
npm run build
sudo systemctl reload nginx
```

## 📊 Monitoring & Logs

### Backend logs:

```bash
# View live logs
sudo journalctl -u ranking-backend -f

# View error logs
sudo tail -f /var/log/ranking-checker/backend-error.log
```

### Nginx logs:

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

## 🔧 Troubleshooting

### Backend không start:

```bash
# Check service status
sudo systemctl status ranking-backend

# Check logs
sudo journalctl -u ranking-backend -n 50

# Test run manually (backend runs on port 8001)
cd /var/www/ranking-checker/backend
source venv/bin/activate
python app.py
```

### Port conflict:

Backend đã được cấu hình chạy trên port **8001** để tránh conflict với các webapp khác trên VPS. Nếu cần đổi port:
1. Sửa port trong `backend/app.py` (dòng 928)
2. Sửa upstream port trong `nginx.conf` (dòng 4)
3. Restart cả backend và nginx

### Database locked error (SQLite):

**Triệu chứng:**
```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) database is locked
[SQL: DELETE FROM templates WHERE templates.id = ?]
```

**Nguyên nhân:** SQLite không hỗ trợ tốt multiple processes (Gunicorn workers) cùng ghi database.

**Giải pháp:** Chạy script tự động fix:

```bash
cd /var/www/ranking-checker
chmod +x fix-gunicorn-sqlite.sh
./fix-gunicorn-sqlite.sh
```

Script này sẽ:
- Thay đổi Gunicorn từ multiple workers sang 1 worker với 4 threads
- Threads an toàn với SQLite, processes thì không
- Vẫn xử lý được multiple concurrent requests

**Kiểm tra sau khi fix:**
```bash
# Check service đang chạy với bao nhiêu workers
sudo systemctl status ranking-backend

# Test template deletion
curl -X DELETE https://ranking.aeseo1.org/api/templates/[ID]
```

**Giải pháp dài hạn (nếu cần scale lớn):**
Nếu cần nhiều workers để handle traffic cao, migrate sang PostgreSQL:
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Update requirements.txt
pip install psycopg2-binary

# Update SQLALCHEMY_DATABASE_URI trong app.py
```

### CORS errors:

Kiểm tra file `backend/app.py` dòng 66-79 - đảm bảo domain đã được thêm vào allowed origins.

### SSL certificate renewal:

```bash
# Auto-renewal được setup sẵn bởi certbot
# Test renewal:
sudo certbot renew --dry-run
```

## 🎯 Checklist Deploy

- [ ] VPS đã cài đặt Python, Node.js, Nginx
- [ ] Code đã upload và giải nén tại /var/www/ranking-checker
- [ ] Backend venv đã tạo và dependencies đã cài
- [ ] File .env đã được cấu hình với SECRET_KEY và SERPER_API_KEY
- [ ] Database đã được tạo (templates.db)
- [ ] Systemd service đã được enable và start
- [ ] Frontend đã build (npm run build)
- [ ] SSL certificate đã obtain từ Let's Encrypt
- [ ] Nginx config đã được setup và test
- [ ] Domain đã point DNS A record đến VPS IP
- [ ] Test endpoints /health và /api/templates thành công
- [ ] Website có thể truy cập qua HTTPS

## 🔑 Important Notes

1. **SECRET_KEY**: Tạo secret key ngẫu nhiên bằng:
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

2. **SERPER_API_KEY**: Lấy từ https://serper.dev

3. **Database backup**: Nên backup file `backend/instance/templates.db` định kỳ

4. **Auto-check scheduler**: Backend đã tích hợp APScheduler để tự động check tracking lúc 11:00 AM mỗi ngày

5. **Firewall**: Đảm bảo ports 80, 443 đã mở:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw reload
   ```
