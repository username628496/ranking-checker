#!/bin/bash

# Script to push Ranking Checker to GitHub
# Usage: ./push-to-github.sh

echo "🚀 Pushing Ranking Checker to GitHub..."
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: This is not a git repository"
    echo "Run: git init"
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"
echo ""

# Add all files
echo "📦 Adding files..."
git add .

# Show status
echo ""
echo "📋 Files to be committed:"
git status --short

echo ""
read -p "❓ Continue with commit? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

# Commit
echo ""
read -p "💬 Enter commit message (or press Enter for default): " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update: Prepare for production deployment

- Add comprehensive README.md for contributors
- Update .gitignore for Python and Node.js
- Add CONTRIBUTING.md guidelines
- Add LICENSE (MIT)
- Add deployment configuration files
- Configure CORS for production domain
- Update API base URL for production

🎯 Ready for deployment to ranking.aeseo1.org"
fi

echo ""
echo "📝 Committing with message:"
echo "$COMMIT_MSG"
echo ""

git commit -m "$COMMIT_MSG"

# Check if remote exists
if ! git remote | grep -q origin; then
    echo ""
    echo "⚠️  No remote 'origin' found"
    echo "📎 Adding remote: https://github.com/username628496/ranking-checker.git"
    git remote add origin https://github.com/username628496/ranking-checker.git
fi

# Push
echo ""
echo "⬆️  Pushing to GitHub..."
git push -u origin $CURRENT_BRANCH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🔗 Repository: https://github.com/username628496/ranking-checker"
    echo ""
    echo "📚 Next steps:"
    echo "1. Visit the repository on GitHub"
    echo "2. Check that all files are uploaded"
    echo "3. Set up repository settings (enable Issues, Wiki, etc.)"
    echo "4. Add collaborators if needed"
    echo "5. Review DEPLOY.md for production deployment"
else
    echo ""
    echo "❌ Error pushing to GitHub"
    echo "💡 Possible solutions:"
    echo "   - Check your GitHub credentials"
    echo "   - Ensure you have push access to the repository"
    echo "   - Try: git push -u origin $CURRENT_BRANCH --force (use with caution!)"
fi
