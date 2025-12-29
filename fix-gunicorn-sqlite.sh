#!/bin/bash

# Script to fix SQLite database locking issue on VPS
# Problem: Multiple Gunicorn workers cause SQLite database locks
# Solution: Use 1 worker with multiple threads instead

echo "🔧 Fixing Gunicorn configuration for SQLite compatibility..."
echo ""

# Backup existing service file
echo "1. Creating backup of systemd service file..."
sudo cp /etc/systemd/system/ranking-backend.service /etc/systemd/system/ranking-backend.service.backup
echo "   ✓ Backup created at: /etc/systemd/system/ranking-backend.service.backup"
echo ""

# Create new service file with single worker configuration
echo "2. Creating updated service file..."
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

# IMPORTANT: Using 1 worker with 4 threads to avoid SQLite locking issues
# SQLite doesn't handle multiple processes well, but threads are fine
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

echo "   ✓ Service file updated with single worker configuration"
echo ""

# Reload systemd daemon
echo "3. Reloading systemd daemon..."
sudo systemctl daemon-reload
echo "   ✓ Systemd daemon reloaded"
echo ""

# Restart backend service
echo "4. Restarting ranking-backend service..."
sudo systemctl restart ranking-backend
sleep 3
echo "   ✓ Service restarted"
echo ""

# Check service status
echo "5. Checking service status..."
if sudo systemctl is-active --quiet ranking-backend; then
    echo "   ✓ Service is running"
    echo ""
    sudo systemctl status ranking-backend --no-pager -l
else
    echo "   ✗ Service failed to start"
    echo ""
    echo "Error logs:"
    sudo journalctl -u ranking-backend -n 50 --no-pager
    exit 1
fi

echo ""
echo "================================"
echo "✅ Gunicorn configuration fixed!"
echo "================================"
echo ""
echo "Changes made:"
echo "  • Workers: multiple → 1"
echo "  • Threads: none → 4"
echo "  • Worker class: sync → gthread"
echo ""
echo "This configuration prevents SQLite database locking issues"
echo "while still handling multiple concurrent requests via threads."
echo ""
echo "Test template deletion now:"
echo "  curl -X DELETE https://ranking.aeseo1.org/api/templates/[ID]"
echo ""
