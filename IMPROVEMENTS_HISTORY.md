# UI/UX IMPROVEMENTS - HISTORY PAGE
**File:** `frontend/src/pages/HistoryPage.tsx`

---

## CURRENT STATE ANALYSIS

### Layout Structure
```
Header
└─ Error Alert (if error)
└─ Sessions Table Card
   ├─ Loading State (spinner)
   ├─ Empty State (no sessions)
   └─ Table with 8 columns:
      - Date & Time
      - Check Type (single/bulk)
      - Keywords Count
      - Domains Count
      - Status (success/failed)
      - API Credits Used
      - Location
      - Device
└─ Pagination (20 per page)
└─ Summary Text ("Showing X of Y sessions")
```

### Current User Flow
1. Page loads → Fetches sessions from API
2. User views table of session metadata
3. User can paginate through sessions
4. **Cannot** view detailed results
5. **Cannot** filter or search
6. **Cannot** export history

---

## 🔴 CRITICAL IMPROVEMENTS (P0)

### 1. Add Session Detail View/Modal

**Problem:** THE BIGGEST ISSUE - History is useless without seeing results
- Users cannot see what keywords/domains were checked
- Cannot see actual ranking results from that session
- Cannot verify past checks
- Cannot compare sessions

**Proposed Solution:**

```typescript
import { Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

// Add state for detail modal
const [selectedSession, setSelectedSession] = useState<Session | null>(null);
const [sessionDetails, setSessionDetails] = useState<RankResult[]>([]);
const [detailsLoading, setDetailsLoading] = useState(false);
const [detailModalOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);

// Fetch session details
async function loadSessionDetails(sessionId: string) {
  setDetailsLoading(true);
  try {
    const response = await axios.get(`${API_ENDPOINTS.HISTORY_SESSION_DETAILS}/${sessionId}`);
    setSessionDetails(response.data.results || []);
    openDetails();
  } catch (err) {
    const errorMessage = getErrorMessage(err, 'Failed to load session details');
    notifications.show({
      title: 'Error',
      message: errorMessage,
      color: 'red',
      icon: <AlertCircle size={16} />,
    });
  } finally {
    setDetailsLoading(false);
  }
}

// Make table rows clickable
<Table.Tr
  key={session.session_id}
  style={{
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'transparent';
  }}
  onClick={() => {
    setSelectedSession(session);
    loadSessionDetails(session.session_id);
  }}
>
  {/* Existing cells */}
  <Table.Td>
    <Group gap="xs">
      <Text size="xs">
        {formatSessionDateTime(session.checked_at)}
      </Text>
      <ActionIcon variant="subtle" size="xs">
        <ExternalLink size={12} />
      </ActionIcon>
    </Group>
  </Table.Td>
  {/* ... rest of cells */}
</Table.Tr>

// Session Detail Modal
<Modal
  opened={detailModalOpened}
  onClose={closeDetails}
  title={
    <Group gap="xs">
      <Text fw={600}>Session Details</Text>
      {selectedSession && (
        <>
          <Badge variant="light" color={getCheckTypeBadgeColor(selectedSession.check_type)}>
            {getCheckTypeLabel(selectedSession.check_type)}
          </Badge>
          <Text size="xs" c="dimmed">
            {formatSessionDateTime(selectedSession.checked_at)}
          </Text>
        </>
      )}
    </Group>
  }
  size="xl"
  padding="md"
>
  {detailsLoading ? (
    <Stack align="center" gap="md" py="xl">
      <Loader size="lg" />
      <Text size="sm" c="dimmed">Loading session details...</Text>
    </Stack>
  ) : sessionDetails.length === 0 ? (
    <Alert icon={<AlertCircle size={16} />} color="gray">
      No results found for this session
    </Alert>
  ) : (
    <Stack gap="md">
      {/* Summary Stats */}
      <SimpleGrid cols={4} spacing="md">
        <Card withBorder p="sm">
          <Text size="xs" c="dimmed">Keywords</Text>
          <Text size="lg" fw={600}>{selectedSession?.keyword_count}</Text>
        </Card>
        <Card withBorder p="sm">
          <Text size="xs" c="dimmed">Domains</Text>
          <Text size="lg" fw={600}>{selectedSession?.domain_count}</Text>
        </Card>
        <Card withBorder p="sm">
          <Text size="xs" c="dimmed">API Credits</Text>
          <Text size="lg" fw={600}>{selectedSession?.api_credits_used}</Text>
        </Card>
        <Card withBorder p="sm">
          <Text size="xs" c="dimmed">Success Rate</Text>
          <Text size="lg" fw={600}>
            {selectedSession && selectedSession.total_records > 0
              ? Math.round((sessionDetails.filter(r => r.position <= 100).length / selectedSession.total_records) * 100)
              : 0}%
          </Text>
        </Card>
      </SimpleGrid>

      {/* Export button */}
      <Group justify="space-between">
        <Text fw={500} size="sm">{sessionDetails.length} Results</Text>
        <Menu shadow="md">
          <Menu.Target>
            <Button variant="light" size="xs" leftSection={<Download size={14} />}>
              Export
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<FileText size={14} />}
              onClick={() => exportSessionCSV(sessionDetails, selectedSession)}
            >
              Export as CSV
            </Menu.Item>
            <Menu.Item
              leftSection={<FileSpreadsheet size={14} />}
              onClick={() => exportSessionExcel(sessionDetails, selectedSession)}
            >
              Export as Excel
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Results Table */}
      <Table.ScrollContainer minWidth={600}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Keyword</Table.Th>
              <Table.Th>Domain</Table.Th>
              <Table.Th>Position</Table.Th>
              <Table.Th>URL</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sessionDetails.map((result, idx) => (
              <Table.Tr key={idx}>
                <Table.Td>
                  <Text size="sm">{result.keyword}</Text>
                </Table.Td>
                <Table.Td>
                  <Code>{result.domain}</Code>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      result.position <= 10 ? 'green' :
                      result.position <= 20 ? 'blue' :
                      result.position <= 30 ? 'yellow' : 'gray'
                    }
                  >
                    #{result.position}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Anchor
                    href={result.url}
                    target="_blank"
                    size="xs"
                    lineClamp={1}
                  >
                    {result.url}
                  </Anchor>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  )}
</Modal>
```

**Backend Required:**
```python
# backend/routes/history.py

@history_bp.route("/sessions/<session_id>/details", methods=["GET"])
def get_session_details(session_id: str):
    """
    Get detailed results for a specific session

    Args:
        session_id: The session ID to fetch

    Returns:
        {
            "session_id": "session_xxx",
            "results": [
                {"keyword": "...", "domain": "...", "position": 1, ...},
                ...
            ]
        }
    """
    try:
        results = RankHistory.query.filter_by(
            session_id=session_id
        ).order_by(
            RankHistory.keyword.asc(),
            RankHistory.position.asc()
        ).all()

        return jsonify({
            "session_id": session_id,
            "results": [{
                "id": r.id,
                "keyword": r.keyword,
                "domain": r.domain,
                "position": r.position,
                "url": r.url,
                "title": r.title,
                "location": r.location,
                "device": r.device,
                "checked_at": r.checked_at.isoformat() + 'Z' if r.checked_at else None,
                "redirect_chain": r.redirect_chain,
            } for r in results]
        })

    except Exception as e:
        logger.error(f"Error fetching session details: {e}")
        return jsonify({"error": str(e)}), 500
```

**Add to API config:**
```typescript
export const API_ENDPOINTS = {
  // ... existing
  HISTORY_SESSION_DETAILS: `${API_BASE}/history/sessions`, // NEW
} as const;
```

**Estimated Effort:** 8-10 hours

---

### 2. Add Filtering & Search

**Problem:** Cannot find specific sessions in large history

**Implementation:**

```typescript
// Add filter state
const [filterCheckType, setFilterCheckType] = useState<string>('all');
const [filterStatus, setFilterStatus] = useState<string>('all');
const [filterLocation, setFilterLocation] = useState<string>('all');
const [filterDevice, setFilterDevice] = useState<string>('all');
const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
const [searchQuery, setSearchQuery] = useState('');

// Build filter query params
const loadSessions = async (pageNum: number = 1) => {
  setLoading(true);
  setError(null);
  try {
    const params: any = {
      page: pageNum,
      per_page: perPage,
    };

    // Add filters
    if (filterCheckType !== 'all') params.check_type = filterCheckType;
    if (filterStatus !== 'all') params.status = filterStatus === 'success' ? 'true' : 'false';
    if (filterLocation !== 'all') params.location = filterLocation;
    if (filterDevice !== 'all') params.device = filterDevice;
    if (dateRange[0]) params.start_date = dateRange[0].toISOString();
    if (dateRange[1]) params.end_date = dateRange[1].toISOString();
    if (searchQuery) params.search = searchQuery;

    const response = await axios.get(API_ENDPOINTS.HISTORY_SESSIONS, { params });

    setSessions(response.data.sessions || []);
    setTotalPages(response.data.total_pages || 1);
    setTotal(response.data.total || 0);
    setPage(response.data.page || 1);
  } catch (err) {
    const errorMessage = getErrorMessage(err, "Failed to load history sessions");
    setError(errorMessage);
    console.error("Error loading sessions:", err);
  } finally {
    setLoading(false);
  }
};

// Trigger on filter change
useEffect(() => {
  loadSessions(1); // Reset to page 1 when filters change
}, [filterCheckType, filterStatus, filterLocation, filterDevice, dateRange, searchQuery]);

// Filter UI
<Card withBorder shadow="sm" p="md" mb="md">
  <Group gap="xs" mb="md">
    <Filter size={16} color="var(--mantine-color-dimmed)" />
    <Text fw={600} size="sm">Filter Sessions</Text>
    {(filterCheckType !== 'all' || filterStatus !== 'all' || searchQuery) && (
      <Badge variant="light" color="blue">
        Filters Active
      </Badge>
    )}
  </Group>

  <Stack gap="md">
    <Group gap="md" align="flex-end">
      <TextInput
        placeholder="Search sessions..."
        leftSection={<Search size={16} />}
        rightSection={
          searchQuery ? (
            <ActionIcon variant="subtle" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </ActionIcon>
          ) : null
        }
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ flex: 1 }}
      />

      <Select
        placeholder="Check Type"
        data={[
          { value: 'all', label: 'All Types' },
          { value: 'single', label: 'Single Check' },
          { value: 'bulk', label: '30 Ranking' },
        ]}
        value={filterCheckType}
        onChange={(value) => setFilterCheckType(value || 'all')}
        w={150}
      />

      <Select
        placeholder="Status"
        data={[
          { value: 'all', label: 'All Status' },
          { value: 'success', label: 'Success' },
          { value: 'failed', label: 'Failed' },
        ]}
        value={filterStatus}
        onChange={(value) => setFilterStatus(value || 'all')}
        w={130}
      />

      <Select
        placeholder="Location"
        data={[
          { value: 'all', label: 'All Locations' },
          { value: 'vn', label: 'Nationwide' },
          { value: 'hanoi', label: 'Hanoi' },
          { value: 'hochiminh', label: 'Ho Chi Minh' },
          { value: 'danang', label: 'Da Nang' },
        ]}
        value={filterLocation}
        onChange={(value) => setFilterLocation(value || 'all')}
        w={150}
      />

      <Select
        placeholder="Device"
        data={[
          { value: 'all', label: 'All Devices' },
          { value: 'desktop', label: 'Desktop' },
          { value: 'mobile', label: 'Mobile' },
        ]}
        value={filterDevice}
        onChange={(value) => setFilterDevice(value || 'all')}
        w={130}
      />

      {(filterCheckType !== 'all' || filterStatus !== 'all' || filterLocation !== 'all' || filterDevice !== 'all' || searchQuery) && (
        <Button
          variant="light"
          color="gray"
          onClick={() => {
            setFilterCheckType('all');
            setFilterStatus('all');
            setFilterLocation('all');
            setFilterDevice('all');
            setSearchQuery('');
          }}
        >
          Clear
        </Button>
      )}
    </Group>

    {/* Date range picker */}
    <DatePickerInput
      type="range"
      label="Date Range"
      placeholder="Select date range"
      value={dateRange}
      onChange={setDateRange}
      clearable
      w={300}
    />
  </Stack>
</Card>
```

**Backend Support (add to `/sessions` endpoint):**
```python
@history_bp.route("/sessions", methods=["GET"])
def get_sessions():
    # ... existing code ...

    # Add filter parameters
    check_type = request.args.get("check_type")
    status = request.args.get("status")  # 'true' or 'false'
    location = request.args.get("location")
    device = request.args.get("device")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    search = request.args.get("search")

    # Apply filters to base_query
    if check_type:
        base_query = base_query.filter(RankHistory.check_type == check_type)
    if location:
        base_query = base_query.filter(RankHistory.location == location)
    if device:
        base_query = base_query.filter(RankHistory.device == device)
    if start_date:
        base_query = base_query.filter(RankHistory.checked_at >= datetime.fromisoformat(start_date))
    if end_date:
        base_query = base_query.filter(RankHistory.checked_at <= datetime.fromisoformat(end_date))

    # ... rest of existing code ...
```

**Estimated Effort:** 6-8 hours

---

## 🟡 HIGH PRIORITY IMPROVEMENTS (P1)

### 3. Add API Usage Dashboard

**Feature:** Visualize API credit usage over time

```typescript
import { AreaChart, BarChart } from '@mantine/charts';

// Fetch usage stats
const [usageStats, setUsageStats] = useState<any>(null);

useEffect(() => {
  loadUsageStats();
}, []);

async function loadUsageStats() {
  try {
    const response = await axios.get(API_ENDPOINTS.HISTORY_USAGE_STATS);
    setUsageStats(response.data);
  } catch (err) {
    console.error('Failed to load usage stats:', err);
  }
}

// Add dashboard above sessions table
{usageStats && (
  <Card withBorder shadow="sm" p="md" mb="md">
    <Group gap="xs" mb="md">
      <Activity size={16} color="var(--mantine-color-dimmed)" />
      <Text fw={600} size="sm">API Usage Overview</Text>
    </Group>

    {/* Stats Grid */}
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
      <Card withBorder p="sm">
        <Group gap="xs" mb="xs">
          <Coins size={16} color="var(--mantine-color-blue-6)" />
          <Text size="xs" c="dimmed">Today</Text>
        </Group>
        <Text size="xl" fw={700}>{usageStats.todayCredits}</Text>
        <Text size="xs" c="dimmed">credits</Text>
      </Card>

      <Card withBorder p="sm">
        <Group gap="xs" mb="xs">
          <TrendingUp size={16} color="var(--mantine-color-green-6)" />
          <Text size="xs" c="dimmed">This Month</Text>
        </Group>
        <Text size="xl" fw={700}>{usageStats.monthCredits}</Text>
        <Text size="xs" c="dimmed">credits</Text>
      </Card>

      <Card withBorder p="sm">
        <Group gap="xs" mb="xs">
          <Calendar size={16} color="var(--mantine-color-violet-6)" />
          <Text size="xs" c="dimmed">Avg per Day</Text>
        </Group>
        <Text size="xl" fw={700}>{Math.round(usageStats.avgPerDay)}</Text>
        <Text size="xs" c="dimmed">credits</Text>
      </Card>

      <Card withBorder p="sm">
        <Group gap="xs" mb="xs">
          <BarChart2 size={16} color="var(--mantine-color-orange-6)" />
          <Text size="xs" c="dimmed">Total Checks</Text>
        </Group>
        <Text size="xl" fw={700}>{usageStats.totalChecks}</Text>
        <Text size="xs" c="dimmed">sessions</Text>
      </Card>
    </SimpleGrid>

    {/* Usage Chart */}
    <Stack gap="xs" mb="md">
      <Text size="sm" fw={500}>Last 30 Days</Text>
      <AreaChart
        h={200}
        data={usageStats.last30Days}
        dataKey="date"
        series={[
          { name: 'credits', color: 'blue.6', label: 'API Credits' }
        ]}
        curveType="monotone"
        withLegend
        tickLine="y"
        gridAxis="y"
      />
    </Stack>

    {/* Check Type Breakdown */}
    <SimpleGrid cols={2} spacing="md">
      <Stack gap="xs">
        <Text size="sm" fw={500}>By Check Type</Text>
        <BarChart
          h={150}
          data={[
            { type: 'Single', count: usageStats.singleCheckCount },
            { type: 'Bulk', count: usageStats.bulkCheckCount },
          ]}
          dataKey="type"
          series={[{ name: 'count', color: 'violet.6' }]}
        />
      </Stack>

      <Stack gap="xs">
        <Text size="sm" fw={500}>By Device</Text>
        <BarChart
          h={150}
          data={[
            { device: 'Desktop', count: usageStats.desktopCount },
            { device: 'Mobile', count: usageStats.mobileCount },
          ]}
          dataKey="device"
          series={[{ name: 'count', color: 'green.6' }]}
        />
      </Stack>
    </SimpleGrid>
  </Card>
)}
```

**Backend Endpoint:**
```python
@history_bp.route("/usage-stats", methods=["GET"])
def get_usage_stats():
    """Get API usage statistics"""
    today = date.today()

    # Today's credits
    today_credits = db.session.query(
        func.sum(RankHistory.api_credits_used)
    ).filter(
        func.date(RankHistory.checked_at) == today
    ).scalar() or 0

    # Month's credits
    month_start = today.replace(day=1)
    month_credits = db.session.query(
        func.sum(RankHistory.api_credits_used)
    ).filter(
        RankHistory.checked_at >= month_start
    ).scalar() or 0

    # Last 30 days
    last_30_days = []
    for i in range(30):
        day = today - timedelta(days=i)
        credits = db.session.query(
            func.sum(RankHistory.api_credits_used)
        ).filter(
            func.date(RankHistory.checked_at) == day
        ).scalar() or 0

        last_30_days.append({
            'date': day.strftime('%m/%d'),
            'credits': credits
        })

    # Check type breakdown
    single_count = db.session.query(
        func.count(func.distinct(RankHistory.session_id))
    ).filter(RankHistory.check_type == 'single').scalar() or 0

    bulk_count = db.session.query(
        func.count(func.distinct(RankHistory.session_id))
    ).filter(RankHistory.check_type == 'bulk').scalar() or 0

    # Device breakdown
    desktop_count = db.session.query(
        func.count(func.distinct(RankHistory.session_id))
    ).filter(RankHistory.device == 'desktop').scalar() or 0

    mobile_count = db.session.query(
        func.count(func.distinct(RankHistory.session_id))
    ).filter(RankHistory.device == 'mobile').scalar() or 0

    return jsonify({
        'todayCredits': today_credits,
        'monthCredits': month_credits,
        'avgPerDay': month_credits / 30,
        'totalChecks': single_count + bulk_count,
        'last30Days': list(reversed(last_30_days)),
        'singleCheckCount': single_count,
        'bulkCheckCount': bulk_count,
        'desktopCount': desktop_count,
        'mobileCount': mobile_count,
    })
```

**Estimated Effort:** 8-10 hours

---

### 4. Add Export History Functionality

```typescript
<Group gap="xs">
  <Menu shadow="md">
    <Menu.Target>
      <Button variant="light" leftSection={<Download size={16} />}>
        Export History
      </Button>
    </Menu.Target>

    <Menu.Dropdown>
      <Menu.Label>Export Options</Menu.Label>
      <Menu.Item
        leftSection={<FileText size={14} />}
        onClick={() => exportHistoryCSV(sessions)}
      >
        Export Current Page (CSV)
      </Menu.Item>
      <Menu.Item
        leftSection={<FileSpreadsheet size={14} />}
        onClick={() => exportHistoryExcel(sessions)}
      >
        Export Current Page (Excel)
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        leftSection={<Database size={14} />}
        onClick={() => exportAllHistory()}
      >
        Export All History (may take time)
      </Menu.Item>
    </Menu.Dropdown>
  </Menu>
</Group>

function exportHistoryCSV(sessions: Session[]) {
  const rows = [
    'Date,Check Type,Keywords,Domains,Status,API Credits,Location,Device'
  ];

  sessions.forEach(s => {
    rows.push([
      formatSessionDateTime(s.checked_at),
      s.check_type,
      s.keyword_count,
      s.domain_count,
      s.success ? 'Success' : 'Failed',
      s.api_credits_used,
      s.location,
      s.device
    ].join(','));
  });

  const csv = rows.join('\n');
  downloadFile(csv, 'history-export.csv', 'text/csv');

  notifications.show({
    title: 'Export Successful',
    message: `Exported ${sessions.length} sessions`,
    color: 'green',
    icon: <Check size={16} />,
  });
}

async function exportAllHistory() {
  try {
    notifications.show({
      id: 'export-all',
      title: 'Exporting History',
      message: 'This may take a few moments...',
      loading: true,
      autoClose: false,
    });

    // Fetch all sessions (no pagination)
    const response = await axios.get(API_ENDPOINTS.HISTORY_SESSIONS, {
      params: { per_page: 10000 } // Large number to get all
    });

    const allSessions = response.data.sessions || [];
    exportHistoryCSV(allSessions);

    notifications.update({
      id: 'export-all',
      title: 'Export Complete',
      message: `Exported ${allSessions.length} sessions`,
      color: 'green',
      icon: <Check size={16} />,
      loading: false,
      autoClose: 3000,
    });
  } catch (err) {
    notifications.update({
      id: 'export-all',
      title: 'Export Failed',
      message: getErrorMessage(err),
      color: 'red',
      loading: false,
      autoClose: 5000,
    });
  }
}
```

**Estimated Effort:** 3-4 hours

---

## 🟢 MEDIUM PRIORITY (P2)

### 5. Add Session Comparison Tool

```typescript
const [compareMode, setCompareMode] = useState(false);
const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

// Toggle compare mode
<Switch
  label="Compare Mode"
  checked={compareMode}
  onChange={(e) => {
    setCompareMode(e.target.checked);
    if (!e.target.checked) {
      setSelectedForCompare(new Set());
    }
  }}
/>

// Add checkboxes when compare mode active
{compareMode && (
  <Table.Td>
    <Checkbox
      checked={selectedForCompare.has(session.session_id)}
      onChange={(e) => {
        const newSet = new Set(selectedForCompare);
        if (e.target.checked) {
          if (newSet.size < 3) { // Limit to 3 sessions
            newSet.add(session.session_id);
          } else {
            notifications.show({
              message: 'Can only compare up to 3 sessions',
              color: 'yellow',
            });
          }
        } else {
          newSet.delete(session.session_id);
        }
        setSelectedForCompare(newSet);
      }}
    />
  </Table.Td>
)}

// Compare button
{selectedForCompare.size >= 2 && (
  <Button
    onClick={handleCompare}
    leftSection={<GitCompare size={16} />}
  >
    Compare {selectedForCompare.size} Sessions
  </Button>
)}
```

**Estimated Effort:** 8-10 hours

---

## 🔵 QUICK WINS

### 6. Add Sortable Table Columns

```typescript
const [sortColumn, setSortColumn] = useState<string | null>(null);
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

function handleSort(column: string) {
  if (sortColumn === column) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setSortColumn(column);
    setSortDirection('desc');
  }
}

// Sortable header
<Table.Th
  style={{ cursor: 'pointer' }}
  onClick={() => handleSort('checked_at')}
>
  <Group gap={4}>
    <Text size="xs">Date & Time</Text>
    {sortColumn === 'checked_at' && (
      sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    )}
  </Group>
</Table.Th>
```

**Estimated Effort:** 2-3 hours

---

### 7. Add Mobile Card View

```typescript
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  <Stack gap="sm">
    {sessions.map(session => (
      <Card
        key={session.session_id}
        withBorder
        p="sm"
        style={{ cursor: 'pointer' }}
        onClick={() => loadSessionDetails(session.session_id)}
      >
        {/* Mobile-optimized card layout */}
      </Card>
    ))}
  </Stack>
) : (
  <Table.ScrollContainer minWidth={900}>
    {/* Desktop table */}
  </Table.ScrollContainer>
)}
```

**Estimated Effort:** 4-5 hours

---

## ESTIMATED TOTAL EFFORT

| Priority | Tasks | Hours |
|----------|-------|-------|
| P0 Critical | 2 tasks | 14-18h |
| P1 High | 2 tasks | 11-14h |
| P2 Medium | 1 task | 8-10h |
| Quick Wins | 2 tasks | 6-8h |
| **TOTAL** | **7 tasks** | **39-50h** |

---

## IMPLEMENTATION ORDER

1. ✅ **Session Detail Modal** (8-10h) - CRITICAL
2. ✅ **Filtering & Search** (6-8h) - Essential
3. ✅ **API Usage Dashboard** (8-10h) - High value
4. **Export History** (3-4h) - Quick win
5. **Mobile Card View** (4-5h) - Accessibility
6. **Sortable Columns** (2-3h) - UX polish
7. **Session Comparison** (8-10h) - Advanced feature

---

**Document Version:** 1.0
**Last Updated:** February 9, 2026
