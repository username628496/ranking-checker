# Contributing to Ranking Checker

Thank you for your interest in contributing to Ranking Checker! This document provides guidelines for contributors.

## 🤝 How to Contribute

### For All Contributors

We welcome contributions from everyone! Whether you use Claude AI tools or not, you can contribute to this project.

### Getting Started

1. **Fork the repository**
   - Click the "Fork" button at the top right of the repository page
   - This creates your own copy of the project

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ranking-checker.git
   cd ranking-checker
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/username628496/ranking-checker.git
   ```

4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development Setup

#### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SERPER_API_KEY=your_api_key_here
ENVIRONMENT=development
EOF

python app.py
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Making Changes

1. **Write clear, concise code**
   - Follow the existing code style
   - Add comments for complex logic
   - Use meaningful variable and function names

2. **Test your changes**
   - Test manually by running the app
   - Ensure no errors in console/terminal
   - Test edge cases

3. **Update documentation**
   - Update README.md if you add new features
   - Add code comments where necessary
   - Update DEPLOY.md if deployment process changes

### Code Style

#### Python (Backend)

Follow PEP 8 guidelines:

```python
# Good
def process_keyword_ranking(keyword: str, domain: str) -> dict:
    """
    Process ranking for a keyword-domain pair.

    Args:
        keyword: The search keyword
        domain: The domain to check

    Returns:
        Dictionary with ranking results
    """
    # Implementation here
    pass

# Bad
def proc(k,d):
    # no documentation
    pass
```

#### TypeScript/React (Frontend)

Use functional components with TypeScript:

```typescript
// Good
interface Props {
  results: RankResult[];
  onRefresh: () => void;
}

export function ResultTable({ results, onRefresh }: Props) {
  // Component logic
}

// Bad
export function ResultTable(props: any) {
  // No type safety
}
```

### Commit Messages

Use clear, descriptive commit messages following this format:

```
<type>: <short description>

[optional detailed description]

[optional footer]
```

**Types:**
- `Add:` New feature or file
- `Fix:` Bug fix
- `Update:` Modify existing feature
- `Refactor:` Code refactoring
- `Docs:` Documentation changes
- `Style:` Code style/formatting
- `Test:` Add or update tests

**Examples:**

```bash
# Good
git commit -m "Add: CSV export functionality for ranking results"
git commit -m "Fix: CORS error when calling API from production domain"
git commit -m "Update: Improve error handling in SSE connection"

# Bad
git commit -m "fixed bug"
git commit -m "changes"
git commit -m "updates"
```

### Pull Request Process

1. **Update from upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Fill out the PR template:

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have tested my changes
- [ ] I have updated the documentation
- [ ] My changes don't break existing functionality
```

4. **Wait for review**
   - Maintainers will review your PR
   - Address any feedback or requested changes
   - Once approved, your PR will be merged

### What to Contribute

#### Good First Issues

Look for issues labeled `good first issue`:
- Documentation improvements
- Bug fixes
- UI/UX enhancements
- Adding tests

#### Feature Ideas

- Export functionality (CSV, Excel)
- Email notifications
- Advanced charts and graphs
- Competitor analysis
- Multi-user support
- API rate limiting

#### Bug Reports

If you find a bug:

1. Check if it's already reported
2. Create a new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/logs if applicable
   - Your environment (OS, Python/Node version)

**Example:**

```markdown
**Bug:** Results table not displaying on mobile devices

**Steps to reproduce:**
1. Open app on mobile browser
2. Run a ranking check
3. Wait for results

**Expected:** Results table should display
**Actual:** White screen, no table visible

**Environment:**
- Device: iPhone 12
- Browser: Safari 15
- App version: 1.0.0

**Screenshots:** [attach screenshot]
```

### Communication

- Be respectful and professional
- Ask questions if anything is unclear
- Respond to feedback constructively
- Help other contributors when you can

### Code Review Guidelines

When reviewing others' code:

1. **Be kind and constructive**
   - Suggest improvements, don't demand
   - Explain *why* something should change
   - Acknowledge good code

2. **Focus on**
   - Code correctness
   - Performance implications
   - Security issues
   - Code readability

3. **Example feedback:**

```
❌ Bad: "This is wrong"
✅ Good: "This could cause issues when the array is empty. Consider adding a check: if (array.length === 0) return;"

❌ Bad: "Use better variable names"
✅ Good: "Consider renaming 'x' to 'resultCount' for better clarity"
```

### Testing Guidelines

#### Backend Testing

```bash
cd backend
python app.py

# In another terminal
curl http://localhost:8000/health
curl http://localhost:8000/api/templates
```

#### Frontend Testing

```bash
cd frontend
npm run build  # Check for build errors
npm run dev    # Run development server

# Test in browser:
# - Create template
# - Run ranking check
# - View results
# - Test dark mode
# - Test responsive design
```

### Release Process

Maintainers will:

1. Review and merge approved PRs
2. Update version numbers
3. Create release notes
4. Tag releases
5. Deploy to production

### License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

### Questions?

- Check existing issues and PRs
- Create a new issue with the `question` label
- Be specific about what you need help with

### Recognition

All contributors will be:
- Listed in the repository's contributors
- Credited in release notes
- Appreciated by the community! 🎉

---

Thank you for contributing to Ranking Checker! 🚀
