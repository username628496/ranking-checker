#!/bin/bash

# Emergency restore script - restore backup service and fix all issues at once

echo "🚨 Emergency restore starting..."
echo ""

# 1. Stop current broken service
echo "1. Stopping current service..."
sudo systemctl stop ranking-backend
echo "   ✓ Service stopped"
echo ""

# 2. Restore from backup if exists
if [ -f "/etc/systemd/system/ranking-backend.service.backup" ]; then
    echo "2. Restoring service from backup..."
    sudo cp /etc/systemd/system/ranking-backend.service.backup /etc/systemd/system/ranking-backend.service
    echo "   ✓ Service restored from backup"
else
    echo "2. No backup found, creating working service file..."
    sudo tee /etc/systemd/system/ranking-backend.service > /dev/null <<'EOF'
[Unit]
Description=Ranking Checker Backend
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/ranking-checker/backend
Environment="PATH=/var/www/ranking-checker/backend/venv/bin"

ExecStart=/var/www/ranking-checker/backend/venv/bin/gunicorn \
    --workers 1 \
    --threads 4 \
    --worker-class gthread \
    --bind 127.0.0.1:8001 \
    --timeout 300 \
    app:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    echo "   ✓ Created new working service file"
fi
echo ""

# 3. Create log directory (optional - service will work without it)
echo "3. Creating log directory..."
sudo mkdir -p /var/log/ranking-checker
sudo chown www-data:www-data /var/log/ranking-checker
echo "   ✓ Log directory ready"
echo ""

# 4. Fix database permissions
echo "4. Fixing database permissions..."
cd /var/www/ranking-checker/backend
sudo chown -R www-data:www-data instance
if [ -f "instance/templates.db" ]; then
    sudo chmod 664 instance/templates.db
    echo "   ✓ Database permissions fixed"
else
    echo "   ⚠ Database file not found (will be created)"
fi
echo ""

# 5. Fix entire backend directory ownership
echo "5. Fixing backend directory ownership..."
cd /var/www/ranking-checker
sudo chown -R www-data:www-data backend
echo "   ✓ Ownership fixed"
echo ""

# 6. Load environment file
if [ -f ".env.production" ]; then
    echo "6. Loading production environment..."
    source .env.production
    export $(cat .env.production | grep -v '^#' | xargs)
    echo "   ✓ Environment loaded"
else
    echo "6. ⚠ No .env.production file found"
fi
echo ""

# 7. Reload and restart
echo "7. Reloading systemd and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable ranking-backend
sudo systemctl start ranking-backend
sleep 5
echo ""

# 8. Check status
echo "8. Checking service status..."
if sudo systemctl is-active --quiet ranking-backend; then
    echo ""
    echo "========================================="
    echo "✅ SERVICE RESTORED SUCCESSFULLY!"
    echo "========================================="
    echo ""
    sudo systemctl status ranking-backend --no-pager -l | head -25
    echo ""
    echo "Test your webapp:"
    echo "  curl https://ranking.aeseo1.org/health"
    echo "  curl https://ranking.aeseo1.org/api/templates"
    echo ""
else
    echo ""
    echo "========================================="
    echo "❌ SERVICE STILL FAILED"
    echo "========================================="
    echo ""
    echo "Recent logs:"
    sudo journalctl -u ranking-backend -n 50 --no-pager
    echo ""
    echo "Try manual start to see error:"
    echo "  cd /var/www/ranking-checker/backend"
    echo "  source venv/bin/activate"
    echo "  python app.py"
    exit 1
fi
