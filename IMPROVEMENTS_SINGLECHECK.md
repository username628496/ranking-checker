# UI/UX IMPROVEMENTS - SINGLE CHECK PAGE (Home)
**File:** `frontend/src/pages/SingleCheckPage.tsx`

---

## CURRENT STATE ANALYSIS

### Layout Structure
```
Header (with Live badge, Clear button)
└─ Form Card
   ├─ Device/Location Selection
   ├─ Keywords/Domains Textareas (side-by-side)
   └─ Start Check Button
└─ Progress Bar (when streaming)
└─ Top 30 Highlights Card (dynamic)
└─ All Results Table Card
└─ Empty State (when no results)
└─ Templates Section (at bottom)
```

### Current User Flow
1. Enter keywords and domains line-by-line (paired)
2. Select device (Desktop/Mobile) and location
3. Start check → Real-time SSE streaming
4. See Top 30 highlights populate dynamically
5. View full results table
6. Results persist to localStorage

---

## 🔴 CRITICAL IMPROVEMENTS (P0)

### 1. Add Cancel/Pause Button to Streaming

**Problem:** Users cannot stop a running check
- Wastes API credits if started by mistake
- Cannot correct errors mid-stream
- Frustrating for long checks (50+ pairs)

**Current Code (Lines 106-118):**
```typescript
function handleStart(p: {
  sessionId: string;
  total: number;
  keywords: string[];
  domains: string[];
}) {
  cancel();
  setSessionId(null);
  setResults([]);
  setError(null);
  setExpectedTotal(p.total);
  setSessionId(p.sessionId);
}
```

**Proposed Solution:**

```typescript
// Add cancel button to ProgressBar component
// File: frontend/src/components/ProgressBar.tsx

export default function ProgressBar({
  done,
  total,
  current,
  statusText,
  ended,
  onCancel, // NEW PROP
}: ProgressBarProps & { onCancel?: () => void }) {
  return (
    <Stack gap="md">
      {/* Existing progress bar UI */}

      {/* Add cancel button when streaming */}
      {!ended && onCancel && (
        <Group justify="center">
          <Button
            variant="outline"
            color="red"
            size="sm"
            leftSection={<XCircle size={16} />}
            onClick={onCancel}
          >
            Cancel Check
          </Button>
        </Group>
      )}
    </Stack>
  );
}

// Update SingleCheckPage.tsx
<ProgressBar
  done={done}
  total={expectedTotal || done}
  current={current ? { keyword: current.keyword, domain: current.domain } : null}
  statusText={...}
  ended={status === "ended"}
  onCancel={status === "streaming" ? handleCancelCheck : undefined} // NEW
/>

// Add cancel handler
function handleCancelCheck() {
  if (window.confirm('Are you sure you want to cancel this check?')) {
    cancel(); // Existing useSSE cancel function
    notifications.show({
      title: 'Check Cancelled',
      message: 'The ranking check has been stopped',
      color: 'orange',
      icon: <XCircle size={16} />,
    });
  }
}
```

**Estimated Effort:** 2-3 hours

---

### 2. Move Templates to Modal

**Problem:** Templates hidden at bottom, requires scrolling

**Current Location (Lines 275-282):**
```typescript
{/* Templates - Moved to bottom */}
<Card withBorder shadow="sm" p="md">
  <Group gap="xs" mb="md">
    <FileText size={16} color="var(--mantine-color-dimmed)" />
    <Text fw={600} size="sm">Saved Templates</Text>
  </Group>
  <UserTemplate onUseTemplate={handleUseTemplate} />
</Card>
```

**Proposed Solution:**

```typescript
import { Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

export default function SingleCheckPage() {
  const [templateModalOpened, { open: openTemplates, close: closeTemplates }] = useDisclosure(false);

  // ... existing state

  function handleUseTemplate(keywords: string, domains: string) {
    setTemplateData({ keywords, domains });
    closeTemplates(); // Close modal after selection
    setTimeout(() => setTemplateData(null), 100);
  }

  return (
    <Box style={{ height: '100%', overflow: 'auto' }} p="md">
      <Stack gap="md" maw={1200} mx="auto">
        {/* Header with Template button */}
        <Group justify="space-between" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
          <Group gap="md">
            <Target size={20} color="var(--mantine-color-blue-6)" />
            <Box>
              <Text size="lg" fw={600}>Keyword Rank Checker</Text>
              <Text size="xs" c="dimmed">Track rankings in real-time</Text>
            </Box>
          </Group>
          <Group gap="xs">
            {/* NEW: Template button */}
            <Button
              variant="light"
              leftSection={<FileText size={16} />}
              onClick={openTemplates}
            >
              Templates
            </Button>

            {status === "streaming" && (
              <Badge variant="filled" color="blue" leftSection={<Activity size={12} />}>
                Live
              </Badge>
            )}
            {results.length > 0 && status !== "streaming" && (
              <Tooltip label="Clear all results">
                <ActionIcon variant="subtle" color="gray" onClick={handleClearResults} size="lg">
                  <Trash2 size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* ... rest of the page ... */}

        {/* Template Modal */}
        <Modal
          opened={templateModalOpened}
          onClose={closeTemplates}
          title="Saved Templates"
          size="xl"
          padding="md"
        >
          <UserTemplate onUseTemplate={handleUseTemplate} />
        </Modal>
      </Stack>
    </Box>
  );
}
```

**Benefits:**
- Templates always accessible (no scrolling)
- Cleaner page layout
- Modal focuses user attention
- Can be opened anytime with button

**Estimated Effort:** 3-4 hours

---

### 3. Add Export Functionality

**Problem:** No way to save results externally

**Proposed Implementation:**

```typescript
import { Menu } from '@mantine/core';
import { Download } from 'lucide-react';

// Add to Results Card header (line 234)
<Card.Section p="md" withBorder>
  <Group justify="space-between">
    <Group gap="xs">
      <CheckCircle2 size={16} color="var(--mantine-color-dimmed)" />
      <Text fw={600} size="sm">All Results</Text>
    </Group>
    <Group gap="xs">
      <Badge variant="light">{results.length}</Badge>

      {/* NEW: Export Menu */}
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="light" size="xs" leftSection={<Download size={14} />}>
            Export
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Export Format</Menu.Label>
          <Menu.Item
            leftSection={<FileText size={14} />}
            onClick={() => exportCSV(results)}
          >
            Export as CSV
          </Menu.Item>
          <Menu.Item
            leftSection={<FileSpreadsheet size={14} />}
            onClick={() => exportExcel(results)}
          >
            Export as Excel
          </Menu.Item>
          <Menu.Item
            leftSection={<FileType size={14} />}
            onClick={() => exportJSON(results)}
          >
            Export as JSON
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<Copy size={14} />}
            onClick={() => copyToClipboard(results)}
          >
            Copy to Clipboard
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  </Group>
</Card.Section>

// Export utility functions
function exportCSV(results: RankResult[]) {
  const headers = ['Keyword', 'Domain', 'Position', 'URL', 'Title', 'Checked At', 'Location'];
  const rows = results.map(r => [
    r.keyword,
    r.domain,
    r.position,
    r.url,
    r.title || '',
    formatVietnameseDateTime(r.checked_at),
    r.location_display,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadFile(csv, 'ranking-results.csv', 'text/csv');

  notifications.show({
    title: 'Export Successful',
    message: 'Results exported as CSV',
    color: 'green',
    icon: <Check size={16} />,
  });
}

function exportExcel(results: RankResult[]) {
  import('xlsx').then(XLSX => {
    const data = results.map(r => ({
      'Keyword': r.keyword,
      'Domain': r.domain,
      'Position': r.position,
      'URL': r.url,
      'Title': r.title || '',
      'Checked At': formatVietnameseDateTime(r.checked_at),
      'Location': r.location_display,
      'Redirect Chain': r.redirect_chain?.join(' → ') || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');

    // Auto-size columns
    const cols = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, 20)
    }));
    ws['!cols'] = cols;

    XLSX.writeFile(wb, 'ranking-results.xlsx');

    notifications.show({
      title: 'Export Successful',
      message: 'Results exported as Excel',
      color: 'green',
      icon: <Check size={16} />,
    });
  });
}

function exportJSON(results: RankResult[]) {
  const json = JSON.stringify(results, null, 2);
  downloadFile(json, 'ranking-results.json', 'application/json');

  notifications.show({
    title: 'Export Successful',
    message: 'Results exported as JSON',
    color: 'green',
    icon: <Check size={16} />,
  });
}

function copyToClipboard(results: RankResult[]) {
  const text = results.map(r =>
    `${r.keyword}\t${r.domain}\t${r.position}\t${r.url}`
  ).join('\n');

  navigator.clipboard.writeText(text);

  notifications.show({
    title: 'Copied to Clipboard',
    message: `${results.length} results copied`,
    color: 'green',
    icon: <Copy size={16} />,
  });
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

**Dependencies:**
```bash
npm install xlsx
npm install --save-dev @types/xlsx
```

**Estimated Effort:** 5-6 hours

---

## 🟡 HIGH PRIORITY IMPROVEMENTS (P1)

### 4. Add Result Filtering & Search

**Problem:** Hard to find specific results in large datasets

**Implementation:**

```typescript
// Add state for filters
const [searchQuery, setSearchQuery] = useState('');
const [positionFilter, setPositionFilter] = useState<string>('all');
const [locationFilter, setLocationFilter] = useState<string>('all');

// Filter results
const filteredResults = useMemo(() => {
  return results.filter((result) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesKeyword = result.keyword.toLowerCase().includes(query);
      const matchesDomain = result.domain.toLowerCase().includes(query);
      const matchesTitle = result.title?.toLowerCase().includes(query);

      if (!matchesKeyword && !matchesDomain && !matchesTitle) {
        return false;
      }
    }

    // Position filter
    if (positionFilter !== 'all') {
      const pos = Number(result.position);
      switch (positionFilter) {
        case '1-10':
          if (!(pos >= 1 && pos <= 10)) return false;
          break;
        case '11-20':
          if (!(pos >= 11 && pos <= 20)) return false;
          break;
        case '21-30':
          if (!(pos >= 21 && pos <= 30)) return false;
          break;
        case 'not-ranked':
          if (!(isNaN(pos) || pos > 100)) return false;
          break;
      }
    }

    // Location filter
    if (locationFilter !== 'all' && result.location_display !== locationFilter) {
      return false;
    }

    return true;
  });
}, [results, searchQuery, positionFilter, locationFilter]);

// Add filter UI before results
{results.length > 0 && (
  <Card withBorder shadow="sm" p="md">
    <Group gap="xs" mb="md">
      <Filter size={16} color="var(--mantine-color-dimmed)" />
      <Text fw={600} size="sm">Filter Results</Text>
      {(searchQuery || positionFilter !== 'all' || locationFilter !== 'all') && (
        <Badge variant="light" color="blue">
          {filteredResults.length} / {results.length}
        </Badge>
      )}
    </Group>

    <Group gap="md" align="flex-end">
      <TextInput
        placeholder="Search keywords, domains, or titles..."
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
        placeholder="Position"
        data={[
          { value: 'all', label: 'All Positions' },
          { value: '1-10', label: 'Top 10' },
          { value: '11-20', label: 'Positions 11-20' },
          { value: '21-30', label: 'Positions 21-30' },
          { value: 'not-ranked', label: 'Not Ranked' },
        ]}
        value={positionFilter}
        onChange={(value) => setPositionFilter(value || 'all')}
        w={180}
      />

      <Select
        placeholder="Location"
        data={[
          { value: 'all', label: 'All Locations' },
          ...Array.from(new Set(results.map(r => r.location_display)))
            .map(loc => ({ value: loc, label: loc }))
        ]}
        value={locationFilter}
        onChange={(value) => setLocationFilter(value || 'all')}
        w={150}
      />

      {(searchQuery || positionFilter !== 'all' || locationFilter !== 'all') && (
        <Button
          variant="light"
          color="gray"
          onClick={() => {
            setSearchQuery('');
            setPositionFilter('all');
            setLocationFilter('all');
          }}
        >
          Clear
        </Button>
      )}
    </Group>

    {filteredResults.length === 0 && (
      <Alert icon={<Search size={16} />} title="No Results Found" color="gray" mt="md">
        No results match your filters. Try adjusting your search criteria.
      </Alert>
    )}
  </Card>
)}

{/* Use filteredResults instead of results */}
<ResultTable results={filteredResults as RankResult[]} />
```

**Estimated Effort:** 4-5 hours

---

### 5. Improve Form Validation UX

**Problem:** Validation errors not prominent enough

**Current Issues:**
- No visual indication on textarea (no red border)
- Error messages below inputs are small
- Pair mismatch shown in separate alert

**Proposed Solution:**

```typescript
// In Form component, add error states
const [keywordError, setKeywordError] = useState<string | null>(null);
const [domainError, setDomainError] = useState<string | null>(null);

// Validate on blur or change
function validatePairMatch() {
  const kws = keywords.split('\n').filter(k => k.trim());
  const doms = domains.split('\n').filter(d => d.trim());

  if (kws.length === 0) {
    setKeywordError('Please enter at least one keyword');
    return false;
  }

  if (doms.length === 0) {
    setDomainError('Please enter at least one domain');
    return false;
  }

  if (kws.length !== doms.length) {
    const error = `Mismatch: ${kws.length} keywords vs ${doms.length} domains`;
    setKeywordError(error);
    setDomainError(error);
    return false;
  }

  setKeywordError(null);
  setDomainError(null);
  return true;
}

// Update Textarea with error prop
<Textarea
  label="Keywords (one per line)"
  value={keywords}
  onChange={(e) => {
    setKeywords(e.target.value);
    if (keywordError) validatePairMatch();
  }}
  onBlur={validatePairMatch}
  error={keywordError}
  styles={{
    input: {
      borderColor: keywordError ? 'var(--mantine-color-red-6)' : undefined,
      fontFamily: 'monospace',
    }
  }}
  rows={7}
/>

// Add inline pair count with color coding
<Group gap="xs" mt={4}>
  <Badge
    variant="light"
    color={
      keywordCount === 0 ? 'gray' :
      keywordCount === domainCount ? 'green' : 'red'
    }
  >
    {keywordCount} keywords
  </Badge>
  <Text size="xs" c="dimmed">↔</Text>
  <Badge
    variant="light"
    color={
      domainCount === 0 ? 'gray' :
      keywordCount === domainCount ? 'green' : 'red'
    }
  >
    {domainCount} domains
  </Badge>
  {keywordCount > 0 && keywordCount === domainCount && (
    <Badge variant="light" color="green" leftSection={<Check size={12} />}>
      Matched
    </Badge>
  )}
</Group>
```

**Estimated Effort:** 2-3 hours

---

### 6. Add Position Distribution Chart

**Problem:** Hard to see overall performance at a glance

**Implementation:**

```typescript
import { BarChart } from '@mantine/charts';

// Calculate distribution
const positionDistribution = useMemo(() => {
  const dist = {
    '1-10': 0,
    '11-20': 0,
    '21-30': 0,
    '31-50': 0,
    '51-100': 0,
    'Not Ranked': 0,
  };

  results.forEach((result) => {
    const pos = Number(result.position);
    if (isNaN(pos) || pos > 100) {
      dist['Not Ranked']++;
    } else if (pos <= 10) {
      dist['1-10']++;
    } else if (pos <= 20) {
      dist['11-20']++;
    } else if (pos <= 30) {
      dist['21-30']++;
    } else if (pos <= 50) {
      dist['31-50']++;
    } else {
      dist['51-100']++;
    }
  });

  return Object.entries(dist).map(([range, count]) => ({
    range,
    count,
  }));
}, [results]);

// Add chart after Top 30 Highlights
{results.length > 0 && (
  <Card withBorder shadow="sm" p="md">
    <Group justify="space-between" mb="md">
      <Group gap="xs">
        <BarChart2 size={16} color="var(--mantine-color-dimmed)" />
        <Text fw={600} size="sm">Position Distribution</Text>
      </Group>
      <Text size="xs" c="dimmed">{results.length} total results</Text>
    </Group>

    <BarChart
      h={250}
      data={positionDistribution}
      dataKey="range"
      series={[
        {
          name: 'count',
          color: 'blue.6',
          label: 'Results'
        }
      ]}
      tickLine="y"
      gridAxis="y"
    />
  </Card>
)}
```

**Estimated Effort:** 3-4 hours

---

## 🟢 MEDIUM PRIORITY (P2)

### 7. Add Comparison with Previous Check

**Feature:** Compare current results with last session

```typescript
// Load previous session from history
const [previousResults, setPreviousResults] = useState<RankResult[]>([]);
const [showComparison, setShowComparison] = useState(false);

useEffect(() => {
  if (results.length > 0) {
    // Fetch last session with same keywords
    loadPreviousSession();
  }
}, [results]);

// Comparison view
{showComparison && previousResults.length > 0 && (
  <Card withBorder shadow="sm" p="md">
    <Text fw={600} mb="md">Ranking Changes</Text>
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Keyword</Table.Th>
          <Table.Th>Domain</Table.Th>
          <Table.Th>Previous</Table.Th>
          <Table.Th>Current</Table.Th>
          <Table.Th>Change</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {results.map((current) => {
          const previous = previousResults.find(
            p => p.keyword === current.keyword && p.domain === current.domain
          );

          if (!previous) return null;

          const change = Number(previous.position) - Number(current.position);

          return (
            <Table.Tr key={`${current.keyword}-${current.domain}`}>
              <Table.Td>{current.keyword}</Table.Td>
              <Table.Td>{current.domain}</Table.Td>
              <Table.Td>#{previous.position}</Table.Td>
              <Table.Td>#{current.position}</Table.Td>
              <Table.Td>
                {change > 0 && (
                  <Badge color="green" leftSection={<TrendingUp size={12} />}>
                    +{change}
                  </Badge>
                )}
                {change < 0 && (
                  <Badge color="red" leftSection={<TrendingDown size={12} />}>
                    {change}
                  </Badge>
                )}
                {change === 0 && (
                  <Badge color="gray">No change</Badge>
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  </Card>
)}
```

**Estimated Effort:** 6-8 hours

---

## 🔵 QUICK WINS (1-2 hours each)

### 8. Add Keyboard Shortcut Hints

```typescript
// Add tooltip to Start Check button
<Tooltip label="Press Cmd/Ctrl+Enter to submit" position="top">
  <Button type="submit" fullWidth>
    Start Check
  </Button>
</Tooltip>

// Add keyboard listener
useEffect(() => {
  function handleKeyPress(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      // Submit form if valid
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    }
  }

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

---

### 9. Add Result Row Highlighting on Hover

```typescript
// In ResultTable component, add hover effect
<Table.Tr
  key={idx}
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
    // Optional: Show detail modal
    openResultDetail(result);
  }}
>
```

---

### 10. Add Empty State Suggestions

```typescript
{/* Empty State with suggestions */}
{results.length === 0 && status !== "streaming" && (
  <Card withBorder shadow="sm" p="xl">
    <Stack align="center" gap="md">
      <Box style={{ ... }}>
        <Target size={24} color="var(--mantine-color-dimmed)" />
      </Box>
      <Text fw={600} size="sm">No results yet</Text>
      <Text size="xs" c="dimmed" ta="center" maw={400}>
        Enter keywords and domains above to start checking rankings, or try one of these examples:
      </Text>

      {/* Example templates */}
      <Group gap="xs">
        <Button
          variant="light"
          size="xs"
          onClick={() => {
            setTemplateData({
              keywords: 'seo tools\nkeyword research\nrank tracker',
              domains: 'ahrefs.com\nsemrush.com\nmoz.com'
            });
          }}
        >
          Try SEO Tools Example
        </Button>
        <Button
          variant="light"
          size="xs"
          onClick={openTemplates}
        >
          Browse Templates
        </Button>
      </Group>
    </Stack>
  </Card>
)}
```

---

## ESTIMATED TOTAL EFFORT

| Priority | Tasks | Hours |
|----------|-------|-------|
| P0 Critical | 3 tasks | 10-13h |
| P1 High | 4 tasks | 13-16h |
| P2 Medium | 1 task | 6-8h |
| Quick Wins | 3 tasks | 3-4h |
| **TOTAL** | **11 tasks** | **32-41h** |

---

## IMPLEMENTATION ORDER

1. ✅ **Add Cancel Button** (2-3h) - Most requested
2. ✅ **Move Templates to Modal** (3-4h) - Improves discoverability
3. ✅ **Add Export Functionality** (5-6h) - High user value
4. ✅ **Add Result Filtering** (4-5h) - Essential for large datasets
5. **Improve Form Validation** (2-3h) - Better UX
6. **Add Position Chart** (3-4h) - Visual insights
7. **Quick Wins** (3-4h) - Low effort, high impact
8. **Comparison Feature** (6-8h) - Advanced feature

---

## NEXT STEPS

1. Review priorities with stakeholders
2. Create GitHub issues for each task
3. Start with Quick Wins for immediate impact
4. Implement P0 tasks in next sprint
5. User testing after P0+P1 completion

---

**Document Version:** 1.0
**Last Updated:** February 9, 2026
