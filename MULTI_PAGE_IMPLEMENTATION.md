# Multi-Page Ranking Checker - Implementation Guide

## 🎯 Overview

This document describes the multi-page redesign of the Ranking Checker tool. The system now features **4 main pages** accessible via tab navigation, each with dedicated functionality.

---

## 📐 System Architecture

### Frontend Pages

1. **Page 1: Single Keyword Check** (`/pages/SingleCheckPage.tsx`)
   - Check individual keyword-domain pairs
   - Real-time SSE streaming results
   - Template management integration
   - Top 10 highlights display

2. **Page 2: Bulk Keyword Check** (`/pages/BulkCheckPage.tsx`)
   - Check multiple keywords at once
   - Display top 30 domains per keyword
   - CSV export functionality
   - Device & location filtering

3. **Page 3: API Settings** (`/pages/ApiSettingsPage.tsx`)
   - Configure personal Serper API key
   - Set default preferences (location, device)
   - Adjust request timeout & max workers
   - All settings stored in browser localStorage

4. **Page 4: History / Logs** (`/pages/HistoryPage.tsx`)
   - View all historical ranking checks
   - Filter by keyword, domain, date range, location, device
   - CSV export
   - Sortable results table

### Global Components

- **TabNavigation** (`/components/TabNavigation.tsx`)
  - Global navigation bar
  - Always visible at top
  - Highlights active tab
  - Icons for visual clarity

- **App.tsx** (Main Layout)
  - State-based routing (no React Router dependency)
  - Theme management (light/dark)
  - Background patterns
  - Header & footer

---

## 🔌 Backend Endpoints

### New Endpoints Added

#### 1. Bulk Check Endpoint
```http
POST /api/bulk/check
Content-Type: application/json

{
  "keywords": ["keyword1", "keyword2", ...],
  "location": "vn",
  "device": "desktop",
  "limit": 30
}
```

**Response:**
```json
{
  "results": [
    {
      "keyword": "keyword1",
      "topDomains": [
        {
          "position": 1,
          "domain": "example.com",
          "url": "https://example.com/page",
          "title": "Page Title"
        },
        ...
      ]
    },
    ...
  ]
}
```

#### 2. History Endpoint
```http
GET /api/history/all
Query Params (optional):
  - keyword: filter by keyword (partial match)
  - domain: filter by domain (partial match)
  - location: filter by location code
  - device: filter by device type
  - start_date: ISO format datetime
  - end_date: ISO format datetime
  - limit: max results (default 1000)
```

**Response:**
```json
{
  "results": [
    {
      "id": 123,
      "keyword": "test keyword",
      "domain": "example.com",
      "position": 5,
      "url": "https://example.com/page",
      "location": "vn",
      "device": "desktop",
      "checked_at": "2025-02-05T10:30:00"
    },
    ...
  ]
}
```

### Existing Endpoints (Unchanged)
- `POST /api/stream/save` - Initialize ranking check session
- `GET /api/stream?session_id=xxx` - SSE stream for results
- `GET /api/templates` - Fetch all templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `GET /api/tracking` - Get tracking list
- `POST /api/tracking` - Add tracking
- And more... (see `app.py` for full list)

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Serper API key (get free at https://serper.dev)

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Create .env file or set environment variables:
export SERPER_API_KEY="your_api_key_here"
export SECRET_KEY="your_secret_key"
export ENVIRONMENT="development"

# Run backend
python app.py
# Server runs on http://localhost:8001
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
# Server runs on http://localhost:5173

# Build for production
npm run build
```

---

## 💡 How to Use

### Page 1: Single Keyword Check

1. Enter keywords (one per line)
2. Enter domains (one per line)
3. Select device (Desktop/Mobile)
4. Select location (Vietnam-wide, Hanoi, HCMC, Da Nang)
5. Click "Bắt đầu kiểm tra"
6. Watch real-time progress
7. View top 10 highlights
8. See full results table
9. Save as template for future use

### Page 2: Bulk Keyword Check (Top 30)

1. Navigate to "Bulk Keyword Check (Top 30)" tab
2. Enter keywords (one per line)
3. Select device & location
4. Click "Bắt đầu kiểm tra"
5. View top 30 ranking domains for each keyword
6. Click "Xuất CSV" to download results

**Use Case:** Competitor research, SERP analysis, keyword difficulty assessment

### Page 3: API Settings

1. Navigate to "API Settings" tab
2. Enter your Serper.dev API Key
3. Click "Kiểm tra API Key" to validate
4. Set default preferences:
   - Default location
   - Default device
   - Request timeout (5-60 seconds)
   - Max concurrent workers (1-20)
5. Click "Lưu cài đặt"

**Important Notes:**
- API key is stored in **browser localStorage only** (not sent to server)
- If no personal API key is set, system uses server's default key
- Personal API key helps avoid shared rate limits
- Serper.dev offers 2,500 free searches/month

### Page 4: History / Logs

1. Navigate to "History / Logs" tab
2. Use filters to search:
   - Search by keyword or domain
   - Filter by location
   - Filter by device
   - Filter by date range
3. View results in table
4. Click "Xuất CSV" to export filtered results

**Use Case:** Track ranking changes over time, audit past checks, generate reports

---

## 🔐 API Key Management

### Option 1: User-provided API Key (Recommended)

1. User enters API key in Page 3 (API Settings)
2. Key stored in browser `localStorage`
3. Frontend sends key with requests (future enhancement needed)
4. **Current Status:** Not yet implemented in backend
   - Backend still uses `.env` API key
   - Need to add header-based API key support

### Option 2: Server-side API Key (Current)

- API key configured in `backend/.env`
- All users share same rate limit
- Simpler but less scalable

### Future Enhancement

To support user-provided API keys:

1. **Frontend:** Send API key in request headers
   ```typescript
   const userApiKey = localStorage.getItem('serper_api_key');
   axios.post('/api/bulk/check', data, {
     headers: {
       'X-User-API-Key': userApiKey || ''
     }
   });
   ```

2. **Backend:** Check for user API key first, fallback to server key
   ```python
   def get_api_key():
       user_key = request.headers.get('X-User-API-Key')
       return user_key if user_key else Config.SERPER_API_KEY
   ```

---

## 📁 File Structure

```
ranking-checker/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SingleCheckPage.tsx    ← Page 1
│   │   │   ├── BulkCheckPage.tsx      ← Page 2
│   │   │   ├── ApiSettingsPage.tsx    ← Page 3
│   │   │   ├── HistoryPage.tsx        ← Page 4
│   │   │   └── TrackingPage.tsx       ← (Old, unused)
│   │   ├── components/
│   │   │   ├── TabNavigation.tsx      ← Global nav
│   │   │   ├── Form.tsx               ← Used in Page 1
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── ResultTable.tsx
│   │   │   ├── TopHighlights.tsx
│   │   │   └── UserTemplate.tsx
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx
│   │   ├── hooks/
│   │   │   └── useSSE.ts
│   │   ├── App.tsx                    ← Main layout + routing
│   │   ├── api.ts
│   │   └── main.tsx
│   └── package.json
│
└── backend/
    ├── app.py                         ← Flask app + all endpoints
    ├── models/
    │   ├── template.py
    │   ├── rank_history.py
    │   ├── keyword_tracking.py
    │   └── monthly_snapshot.py
    ├── extensions.py
    ├── requirements.txt
    └── .env
```

---

## 🎨 Design System

### Theme Support
- Light mode (default)
- Dark mode (toggle in header)
- Persistent via localStorage
- Consistent color palette across all pages

### Component Styling
- Tailwind CSS 4.1.18
- DaisyUI 5.5.14 for UI components
- Lucide React icons
- Glassmorphism effects (backdrop-blur)
- Grid background patterns

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Flexible grid layouts
- Overflow handling for tables

---

## ⚡ Performance Considerations

### Frontend
- State-based routing (lighter than React Router)
- Lazy component loading potential
- Debounced search inputs (for filters)
- Virtual scrolling for large tables (future enhancement)

### Backend
- ThreadPoolExecutor for concurrent SERP checks
- Configurable MAX_WORKERS (default: 6)
- Request timeout controls
- SQLite for development (consider PostgreSQL for production)

### Rate Limiting
- Serper API: ~100 requests/minute (free tier)
- Current: No client-side rate limiting
- **Recommendation:** Implement request queuing for bulk operations

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Session Persistence**
   - Sessions stored in-memory (`SESSIONS` dict)
   - Lost on server restart
   - **Fix:** Move to database or Redis

2. **User API Key Not Active**
   - Frontend collects user API keys
   - Backend doesn't use them yet
   - **Fix:** Implement header-based API key selection

3. **No Pagination**
   - History page loads max 1000 records
   - Could be slow with large datasets
   - **Fix:** Add cursor-based pagination

4. **No User Authentication**
   - All data is public/shared
   - Templates visible to everyone
   - **Fix:** Add login system

5. **SQLite in Production**
   - Not ideal for concurrent writes
   - VPS deployment has shown locking issues
   - **Fix:** Migrate to PostgreSQL

### Browser Compatibility
- Tested: Chrome 120+, Firefox 120+, Safari 17+
- localStorage required for settings
- EventSource (SSE) required for real-time updates

---

## 🧪 Testing

### Manual Testing Checklist

#### Page 1: Single Check
- [ ] Submit single keyword-domain pair
- [ ] Submit multiple pairs (batch)
- [ ] View real-time progress
- [ ] See top 10 highlights
- [ ] View full results
- [ ] Save as template
- [ ] Load from template
- [ ] Test error handling (invalid input)

#### Page 2: Bulk Check
- [ ] Check single keyword
- [ ] Check multiple keywords
- [ ] View top 30 domains
- [ ] Export to CSV
- [ ] Change device/location
- [ ] Test with empty input

#### Page 3: Settings
- [ ] Enter API key
- [ ] Test API key validation
- [ ] Clear API key
- [ ] Change default settings
- [ ] Save settings
- [ ] Refresh page (verify persistence)

#### Page 4: History
- [ ] View all history
- [ ] Search by keyword
- [ ] Search by domain
- [ ] Filter by location
- [ ] Filter by device
- [ ] Filter by date range
- [ ] Export filtered results
- [ ] Test with no results

#### General
- [ ] Tab navigation works
- [ ] Theme toggle (light/dark)
- [ ] Responsive on mobile
- [ ] No console errors
- [ ] Backend health check

---

## 🚢 Deployment

### Production Deployment Steps

1. **Backend**
   ```bash
   # Build backend on VPS
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt

   # Configure systemd service
   sudo systemctl restart ranking-backend

   # Verify logs
   sudo journalctl -u ranking-backend -f
   ```

2. **Frontend**
   ```bash
   # Build frontend
   cd frontend
   npm run build

   # Copy dist/ to web server
   sudo cp -r dist/* /var/www/ranking/

   # Restart nginx
   sudo systemctl restart nginx
   ```

3. **Environment Variables**
   ```bash
   # Production .env
   SERPER_API_KEY=your_production_key
   SECRET_KEY=your_secret_key
   ENVIRONMENT=production
   REQUEST_TIMEOUT=15
   MAX_WORKERS=6
   ```

4. **Database Backup**
   ```bash
   # Backup SQLite database
   cp backend/instance/templates.db backend/instance/templates.db.backup
   ```

---

## 📊 Future Enhancements

### High Priority
1. **User Authentication**
   - Login/signup system
   - Per-user templates
   - Per-user API keys
   - Usage tracking

2. **API Key Rotation**
   - Support multiple API keys per user
   - Auto-rotation on rate limit hit
   - Key health monitoring

3. **Advanced Analytics**
   - Ranking trend charts (line graphs)
   - Position change alerts
   - Competitor tracking dashboard
   - SERP feature detection

### Medium Priority
4. **Webhook Integration**
   - Send ranking updates to external services
   - Slack/Discord notifications
   - Email alerts

5. **Scheduled Reports**
   - Daily/weekly ranking reports
   - PDF export
   - Email delivery

6. **API Rate Limiting**
   - Per-user rate limits
   - Request queuing
   - Priority queue for paid users

### Low Priority
7. **Browser Extension**
   - Check rankings from browser
   - Quick SERP analysis
   - Competitor spy tool

8. **Mobile App**
   - React Native app
   - Push notifications
   - Offline mode

---

## 🤝 Contributing

### Code Style
- **Frontend:** Prettier + ESLint
- **Backend:** Black + Flake8
- **Commits:** Conventional commits format

### Git Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Commit: `git commit -m "feat: add feature description"`
4. Push: `git push origin feature/your-feature`
5. Create Pull Request

---

## 📝 Changelog

### Version 2.0.0 (2025-02-05) - Multi-Page Release

**Added:**
- ✨ Multi-page navigation with 4 main pages
- ✨ Bulk Keyword Check feature (top 30 domains)
- ✨ API Settings page with localStorage persistence
- ✨ History/Logs page with advanced filtering
- ✨ CSV export functionality on bulk & history pages
- ✨ Tab navigation component
- 🔌 `/api/bulk/check` endpoint
- 🔌 `/api/history/all` endpoint

**Changed:**
- 🔄 Refactored App.tsx to use state-based routing
- 🔄 Extracted SingleCheckPage from App.tsx
- 🎨 Updated header to work across all pages

**Maintained:**
- ✅ All existing Page 1 functionality
- ✅ Template system
- ✅ SSE streaming
- ✅ Theme support

---

## 📞 Support

### Issues
- Report bugs: https://github.com/your-repo/issues
- Feature requests: Create GitHub issue with "enhancement" label

### Documentation
- API docs: See inline comments in `app.py`
- Component docs: See JSDoc comments in `.tsx` files

---

## 📜 License

Copyright © 2025 AE SEO1. All rights reserved.

---

**Built with ❤️ using React, Flask, and Serper API**
