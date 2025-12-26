# 🎯 Ranking Checker - Google SERP Ranking Tool

A powerful Google search ranking checker tool that helps you track keyword positions for your domains across different locations and devices.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-green.svg)
![React](https://img.shields.io/badge/react-18+-blue.svg)

## ✨ Features

- 🔍 **Real-time SERP Checking** - Check keyword rankings in real-time using Serper API
- 📊 **Multi-location Support** - Check rankings for Vietnam, Hanoi, Ho Chi Minh City, Da Nang
- 📱 **Device Support** - Check rankings for both desktop and mobile devices
- 💾 **Template Management** - Save and reuse keyword-domain combinations
- 📈 **Auto-tracking** - Automatically track keywords daily at 11:00 AM Vietnam time
- 📅 **Monthly Snapshots** - Automatic monthly ranking snapshots for historical data
- 🎨 **Modern UI/UX** - Beautiful Stripe-style interface with dark mode support
- ⚡ **Server-Sent Events** - Real-time progress updates during ranking checks

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 16+
- Serper API Key (get it from [serper.dev](https://serper.dev))

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SERPER_API_KEY=your_serper_api_key_here
ENVIRONMENT=development
EOF

# Run backend
python app.py
```

Backend will run on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📁 Project Structure

```
ranking-checker/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── extensions.py       # SQLAlchemy setup
│   ├── models/            # Database models
│   │   ├── __init__.py
│   │   ├── template.py
│   │   ├── rank_history.py
│   │   ├── keyword_tracking.py
│   │   └── monthly_snapshot.py
│   ├── requirements.txt    # Python dependencies
│   └── instance/          # SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Form.tsx           # Main search form
│   │   │   ├── ProgressBar.tsx    # Progress indicator
│   │   │   ├── ResultTable.tsx    # Results display
│   │   │   ├── TopHighlights.tsx  # Top 10 highlights
│   │   │   └── UserTemplate.tsx   # Template management
│   │   ├── contexts/      # React contexts
│   │   │   └── ThemeContext.tsx
│   │   ├── hooks/         # Custom React hooks
│   │   │   └── useSSE.ts
│   │   ├── pages/         # Page components
│   │   ├── api.ts         # API client
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── nginx.conf             # Nginx configuration for production
├── systemd-backend.service # Systemd service file
├── DEPLOY.md             # Deployment guide
└── README.md             # This file
```

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Required
SERPER_API_KEY=your_serper_api_key_here

# Optional (with defaults)
ENVIRONMENT=development
SECRET_KEY=auto-generated-if-not-set
REQUEST_TIMEOUT=10
MAX_WORKERS=6
MAX_REDIRECTS=10
CHUNK_SIZE=200
```

### Frontend Environment Variables

The frontend automatically detects the environment:
- **Development**: Uses `http://localhost:8000/api`
- **Production**: Uses `https://ranking.aeseo1.org/api`

To customize, edit `frontend/src/api.ts`

## 🎨 UI Components

### Main Features

1. **Search Form** - Configure and start ranking checks
   - Keyword input (one per line)
   - Domain input (one per line)
   - Location selector (VN, Hanoi, HCMC, Da Nang)
   - Device selector (Desktop/Mobile)

2. **Progress Bar** - Real-time progress with Stripe-style design
   - Shows current processing status
   - Displays current keyword being checked
   - Shows completion percentage

3. **Results Table** - Display ranking results
   - Position badges with color coding (green for top 3, yellow for 4-6, red for 7-10)
   - Direct links to ranking URLs
   - Timestamp and location info
   - Footer stats summary

4. **Top Highlights** - Showcase top 10 rankings
   - Categorized by position ranges (1-3, 4-6, 7-10)
   - Icons and color-coded badges
   - Responsive grid layout

5. **Template Management** - Save and reuse configurations
   - Create, edit, delete templates
   - Quick-use functionality
   - Search templates by name or user

## 🔄 API Endpoints

### Template Management
- `GET /api/templates` - Get all templates
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Ranking Check
- `POST /api/stream/save` - Save session and get session_id
- `GET /api/stream?session_id=xxx` - SSE stream for results

### Tracking
- `GET /api/tracking` - Get all tracked keywords
- `POST /api/tracking` - Add keyword to tracking
- `DELETE /api/tracking/:id` - Remove from tracking
- `POST /api/tracking/:id/check` - Manually check a tracked keyword
- `GET /api/tracking/history?keyword=xxx&domain=xxx&days=30` - Get ranking history

### Monthly Snapshots
- `GET /api/tracking/monthly/:year/:month` - Get monthly snapshot

### Health Check
- `GET /health` - Check API health

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### For Contributors Without Claude

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ranking-checker.git
   cd ranking-checker
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes**
   - Follow the existing code style
   - Test your changes locally
   - Update documentation if needed

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Describe your changes clearly

### Code Style Guidelines

**Python (Backend)**
- Follow PEP 8 style guide
- Use type hints where possible
- Add docstrings for functions
- Keep functions focused and small

**TypeScript/React (Frontend)**
- Use functional components with hooks
- Follow existing component structure
- Use TypeScript types/interfaces
- Keep components focused and reusable

### Commit Message Format

```
<type>: <description>

[optional body]
```

Types:
- `Add:` - New feature
- `Fix:` - Bug fix
- `Update:` - Update existing feature
- `Refactor:` - Code refactoring
- `Docs:` - Documentation changes
- `Style:` - Code style changes (formatting, etc.)

### Testing

Before submitting a PR:

1. **Backend testing**
   ```bash
   cd backend
   python app.py  # Should start without errors
   curl http://localhost:8000/health  # Should return {"status":"ok"}
   ```

2. **Frontend testing**
   ```bash
   cd frontend
   npm run build  # Should build without errors
   npm run dev    # Should start dev server
   ```

3. **Integration testing**
   - Start backend
   - Start frontend
   - Test full flow: create template → run check → view results

## 📚 Tech Stack

### Backend
- **Flask** - Python web framework
- **Flask-CORS** - Cross-Origin Resource Sharing
- **SQLAlchemy** - Database ORM
- **APScheduler** - Background job scheduler
- **Requests** - HTTP client
- **Serper API** - Google search API

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first CSS
- **Lucide React** - Icon library

## 🐛 Known Issues

1. **SERP Accuracy** - Results depend on Serper API accuracy
2. **Rate Limiting** - Serper API has rate limits based on your plan
3. **Redirect Handling** - Some complex redirect chains might not be fully resolved

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Serper API](https://serper.dev) for Google search data
- [Stripe](https://stripe.com) for design inspiration
- All contributors who help improve this project

## 📞 Support

- Create an issue on GitHub
- Check [DEPLOY.md](DEPLOY.md) for deployment help
- Review existing issues before creating new ones

## 🔮 Roadmap

- [ ] Export results to CSV/Excel
- [ ] Email notifications for ranking changes
- [ ] Advanced filtering and sorting
- [ ] Competitor analysis
- [ ] Multi-domain comparison charts
- [ ] API authentication
- [ ] Rate limiting per user
- [ ] Webhook support for tracking updates

---

**Made with ❤️ for SEO professionals**
