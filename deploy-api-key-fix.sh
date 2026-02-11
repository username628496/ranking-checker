#!/bin/bash

echo "=========================================="
echo "Deploy API Key Fix to VPS"
echo "=========================================="

# 1. Build frontend
echo ""
echo "1️⃣  Building frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
echo "✅ Frontend built successfully"

cd ..

# 2. Commit changes
echo ""
echo "2️⃣  Committing changes..."
git add .
git commit -m "Fix: Pass user API key from frontend to backend

- Modified serper.py to accept optional api_key parameter
- Modified bulk.py to extract and pass api_key from request
- Modified BulkCheckPage.tsx to send api_key from localStorage
- Users can now use their own Serper API key from Settings page"

if [ $? -ne 0 ]; then
    echo "⚠️  Nothing to commit or commit failed"
fi

# 3. Push to GitHub
echo ""
echo "3️⃣  Pushing to GitHub..."
git push origin main
if [ $? -ne 0 ]; then
    echo "❌ Push failed!"
    exit 1
fi
echo "✅ Pushed to GitHub"

echo ""
echo "=========================================="
echo "✅ Local deployment completed!"
echo "=========================================="
echo ""
echo "📋 Next steps on VPS:"
echo ""
echo "ssh root@your-vps-ip"
echo "cd /var/www/ranking-checker"
echo "git pull origin main"
echo "sudo systemctl restart ranking-backend"
echo "sudo systemctl status ranking-backend"
echo ""
echo "🔑 Don't forget to add your Serper API key in Settings!"
echo "=========================================="
