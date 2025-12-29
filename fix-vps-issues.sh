#!/bin/bash

# Complete VPS fix script for ranking-checker
# Fixes: log directory, database permissions, and Gunicorn configuration

echo "🔧 Fixing VPS issues..."
echo ""

# 1. Create log directory
echo "1. Creating log directory..."
sudo mkdir -p /var/log/ranking-checker
sudo chown www-data:www-data /var/log/ranking-checker
sudo chmod 755 /var/log/ranking-checker
echo "   ✓ Log directory created with proper permissions"
echo ""

# 2. Fix database permissions
echo "2. Fixing database permissions..."
cd /var/www/ranking-checker/backend

# Ensure instance directory exists and has proper permissions
sudo mkdir -p instance
sudo chown -R www-data:www-data instance
sudo chmod 755 instance

# Fix database file permissions if it exists
if [ -f "instance/templates.db" ]; then
    sudo chown www-data:www-data instance/templates.db
    sudo chmod 664 instance/templates.db
    echo "   ✓ Database file permissions fixed"
else
    echo "   ⚠ Database file not found - will be created on first run"
fi

# Fix entire backend directory permissions
cd /var/www/ranking-checker
sudo chown -R www-data:www-data backend
echo "   ✓ Backend directory permissions fixed"
echo ""

# 3. Backup and update systemd service
echo "3. Creating backup of systemd service file..."
if [ -f "/etc/systemd/system/ranking-backend.service" ]; then
    sudo cp /etc/systemd/system/ranking-backend.service /etc/systemd/system/ranking-backend.service.backup
    echo "   ✓ Backup created"
else
    echo "   ⚠ No existing service file found"
fi
echo ""

# 4. Create updated service file
echo "4. Creating updated service file..."
sudo tee /etc/systemd/system/ranking-backend.service > /dev/null <<'EOF'
[Unit]
Description=Ranking Checker Backend (Flask + Gunicorn)
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/ranking-checker/backend
Environment="PATH=/var/www/ranking-checker/backend/venv/bin"
EnvironmentFile=/var/www/ranking-checker/.env.production

# Using 1 worker with 4 threads to avoid SQLite locking issues
ExecStart=/var/www/ranking-checker/backend/venv/bin/gunicorn \
    --workers 1 \
    --threads 4 \
    --worker-class gthread \
    --bind 127.0.0.1:8001 \
    --timeout 300 \
    --access-logfile /var/log/ranking-checker/backend.log \
    --error-logfile /var/log/ranking-checker/backend-error.log \
    --log-level info \
    app:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
echo "   ✓ Service file updated"
echo ""

# 5. Reload systemd daemon
echo "5. Reloading systemd daemon..."
sudo systemctl daemon-reload
echo "   ✓ Systemd daemon reloaded"
echo ""

# 6. Start backend service
echo "6. Starting ranking-backend service..."
sudo systemctl restart ranking-backend
sleep 3
echo ""

# 7. Check service status
echo "7. Checking service status..."
if sudo systemctl is-active --quiet ranking-backend; then
    echo "   ✅ Service is running successfully!"
    echo ""
    sudo systemctl status ranking-backend --no-pager -l | head -20
else
    echo "   ❌ Service failed to start"
    echo ""
    echo "Recent error logs:"
    sudo journalctl -u ranking-backend -n 30 --no-pager
    exit 1
fi

echo ""
echo "================================"
echo "✅ All fixes applied successfully!"
echo "================================"
echo ""
echo "Changes made:"
echo "  • Created /var/log/ranking-checker/ with proper permissions"
echo "  • Fixed backend/instance/ directory permissions"
echo "  • Fixed templates.db file permissions (www-data:www-data)"
echo "  • Updated Gunicorn to 1 worker with 4 threads"
echo ""
echo "Verify the fixes:"
echo "  1. Check service status: sudo systemctl status ranking-backend"
echo "  2. Check logs: sudo tail -f /var/log/ranking-checker/backend.log"
echo "  3. Test API: curl https://ranking.aeseo1.org/api/templates"
echo "  4. Test template deletion in browser"
echo ""
