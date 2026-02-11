#!/bin/bash

echo "🚀 Installing shadcn/ui dependencies..."

# Navigate to frontend directory
cd "$(dirname "$0")"

# Install all required packages
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Open: http://localhost:5173"
echo ""
