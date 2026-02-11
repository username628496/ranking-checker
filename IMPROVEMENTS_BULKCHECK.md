# UI/UX IMPROVEMENTS - BULK CHECK PAGE (30 Ranking)
**File:** `frontend/src/pages/BulkCheckPage.tsx`

---

## CURRENT STATE ANALYSIS

### Layout Structure
```
Header (with progress badge when loading)
└─ Form Card
   ├─ Device/Location Buttons
   ├─ Keywords Textarea
   └─ Start Bulk Check Button
└─ Error Alert (if error)
└─ Results Card
   ├─ Expand/Collapse All + Copy All buttons
   └─ Expandable Keyword Cards
      └─ Table of top 30 domains (when expanded)
└─ Templates Section (at bottom)
```

### Current User Flow
1. Enter multiple keywords (one per line)
2. Select device and location
3. Start bulk check → Single API call (no streaming)
4. Results appear in collapsed cards
5. Expand to view top 30 domains per keyword
6. Copy individual or all results (tab-separated format)

---

## 🔴 CRITICAL IMPROVEMENTS (P0)

### 1. Add Real-Time Streaming Progress

**Problem:** Large batches show no progress, appears frozen
- Users think app crashed with 20+ keywords
- No indication of which keyword is being checked
- Cannot see partial results during processing
- Anxiety-inducing for users

**Current Code (Lines 176-200):**
```typescript
try {
  const timestamp = getCurrentVietnameseTimestamp();

  const response = await axios.post(API_ENDPOINTS.BULK_CHECK, {
    keywords: keywordList,
    location,
    device,
    limit: 30,
  });

  // All results arrive at once
  const resultsWithTimestamp = response.data.results.map((r: BulkResult) => ({
    ...r,
    checkedAt: timestamp
  }));

  setResults(resultsWithTimestamp);
  setProgress(keywordList.length);
} catch (err) {
  const errorMessage = getErrorMessage(err, "Có lỗi xảy ra khi kiểm tra");
  setError(errorMessage);
}
```

**Proposed Solution - Convert to SSE Streaming:**

```typescript
// Backend: Create new streaming endpoint
// File: backend/routes/bulk.py

@bulk_bp.route("/stream", methods=["GET"])
def bulk_check_stream():
    """
    Stream bulk check results one keyword at a time

    Query params:
        - keywords: Comma-separated list
        - location: Location code
        - device: desktop or mobile
        - limit: Results per keyword (default 30)
    """
    keywords_str = request.args.get("keywords", "")
    keywords = [k.strip() for k in keywords_str.split(",") if k.strip()]
    location = request.args.get("location", "vn")
    device = request.args.get("device", "desktop")
    limit = int(request.args.get("limit", 30))

    session_id = f"bulk_{uuid.uuid4().hex[:12]}"

    def generate():
        for idx, keyword in enumerate(keywords):
            try:
                # Fetch top 30 for this keyword
                results = serper_search(
                    keyword=keyword,
                    location=location,
                    device=device,
                    max_results=limit
                )

                # Extract top domains
                top_domains = []
                for i, res in enumerate(results[:limit], 1):
                    top_domains.append({
                        "position": i,
                        "domain": extract_domain(res.get("link", "")),
                        "url": res.get("link", ""),
                        "title": res.get("title", "")
                    })

                # Save to database
                for domain_info in top_domains:
                    rank = RankHistory(
                        keyword=keyword,
                        domain=domain_info["domain"],
                        position=domain_info["position"],
                        url=domain_info["url"],
                        title=domain_info["title"],
                        location=location,
                        device=device,
                        checked_at=datetime.now(timezone.utc),
                        session_id=session_id,
                        check_type="bulk",
                        api_credits_used=1  # 1 credit per keyword
                    )
                    db.session.add(rank)

                db.session.commit()

                # Stream result
                yield f"data: {json.dumps({
                    'keyword': keyword,
                    'topDomains': top_domains,
                    'progress': idx + 1,
                    'total': len(keywords),
                    'checkedAt': datetime.now(timezone.utc).isoformat() + 'Z'
                })}\n\n"

                # Small delay to prevent rate limiting
                time.sleep(0.5)

            except Exception as e:
                logger.error(f"Error checking keyword '{keyword}': {e}")
                yield f"data: {json.dumps({
                    'keyword': keyword,
                    'error': str(e),
                    'progress': idx + 1,
                    'total': len(keywords)
                })}\n\n"

        # End stream
        yield "event: end\ndata: done\n\n"

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

// Frontend: Update to use SSE
// File: frontend/src/pages/BulkCheckPage.tsx

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validation...
  const keywordList = keywords
    .split(/\r?\n/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keywordList.length === 0) {
    setError("Vui lòng nhập ít nhất một từ khóa hợp lệ");
    return;
  }

  setLoading(true);
  setError(null);
  setResults([]);
  setProgress(0);
  setTotalKeywords(keywordList.length);

  // Build SSE URL
  const params = new URLSearchParams({
    keywords: keywordList.join(','),
    location,
    device,
    limit: '30'
  });
  const url = `${API_ENDPOINTS.BULK_STREAM}?${params}`;

  // Create EventSource
  const es = new EventSource(url);

  es.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);

      if (data.error) {
        // Keyword failed, but continue with others
        console.error(`Keyword "${data.keyword}" failed:`, data.error);
      } else if (data.keyword && data.topDomains) {
        // Add result progressively
        setResults((prev) => [...prev, {
          keyword: data.keyword,
          topDomains: data.topDomains,
          checkedAt: data.checkedAt
        }]);
      }

      // Update progress
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }
    } catch (err) {
      console.error('SSE parse error:', err);
    }
  };

  es.addEventListener('end', () => {
    es.close();
    setLoading(false);
    notifications.show({
      title: 'Bulk Check Complete',
      message: `Checked ${keywordList.length} keywords`,
      color: 'green',
      icon: <CheckCircle size={16} />,
    });
  });

  es.onerror = (err) => {
    console.error('SSE error:', err);
    es.close();
    setLoading(false);
    setError('Connection error. Please try again.');
  };
};
```

**Add to API config:**
```typescript
// frontend/src/config/api.ts
export const API_ENDPOINTS = {
  // ... existing endpoints
  BULK_STREAM: `${API_BASE}/bulk/stream`, // NEW
} as const;
```

**Benefits:**
- Real-time progress updates
- See results as they arrive
- Better user experience for large batches
- Can add cancel button later
- Lower perceived wait time

**Estimated Effort:** 8-10 hours

---

### 2. Auto-Expand First N Results

**Problem:** All results collapsed by default, requires manual expansion

**Current Code (Lines 113-120):**
```typescript
function expandAll() {
  setExpandedKeywords(new Set(results.map((_, idx) => idx)));
}

function collapseAll() {
  setExpandedKeywords(new Set());
}
```

**Proposed Solution:**

```typescript
// Auto-expand first 3 results when results arrive
useEffect(() => {
  if (results.length > 0 && expandedKeywords.size === 0) {
    // Auto-expand first 3
    const firstThree = new Set([0, 1, 2].filter(i => i < results.length));
    setExpandedKeywords(firstThree);
  }
}, [results]);

// Add smart expand/collapse options
<Group gap="xs">
  <Menu shadow="md" width={200}>
    <Menu.Target>
      <Button variant="outline" size="xs" leftSection={<ChevronDown size={14} />}>
        Expand Options
      </Button>
    </Menu.Target>

    <Menu.Dropdown>
      <Menu.Item onClick={expandAll}>
        Expand All ({results.length})
      </Menu.Item>
      <Menu.Item onClick={() => expandTopN(5)}>
        Expand Top 5
      </Menu.Item>
      <Menu.Item onClick={() => expandTopN(10)}>
        Expand Top 10
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item onClick={collapseAll}>
        Collapse All
      </Menu.Item>
    </Menu.Dropdown>
  </Menu>

  <Button onClick={collapseAll} variant="outline" size="xs" leftSection={<ChevronUp size={14} />}>
    Collapse All
  </Button>

  <Button onClick={handleCopyAll} variant="outline" size="xs" leftSection={<Copy size={14} />}>
    Copy All
  </Button>
</Group>

function expandTopN(n: number) {
  const topN = new Set(Array.from({ length: Math.min(n, results.length) }, (_, i) => i));
  setExpandedKeywords(topN);
}
```

**Estimated Effort:** 2-3 hours

---

### 3. Add Result Filtering & Sorting

**Problem:** Cannot filter or sort keywords, hard to find best performers

**Implementation:**

```typescript
// Add filter state
const [searchQuery, setSearchQuery] = useState('');
const [sortBy, setSortBy] = useState<'default' | 'keyword' | 'results-desc' | 'results-asc'>('default');
const [minResults, setMinResults] = useState(0);

// Filter and sort results
const processedResults = useMemo(() => {
  let filtered = results;

  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      r.keyword.toLowerCase().includes(query) ||
      r.topDomains.some(d => d.domain.toLowerCase().includes(query))
    );
  }

  // Min results filter
  if (minResults > 0) {
    filtered = filtered.filter(r => r.topDomains.length >= minResults);
  }

  // Sort
  const sorted = [...filtered];
  switch (sortBy) {
    case 'keyword':
      sorted.sort((a, b) => a.keyword.localeCompare(b.keyword));
      break;
    case 'results-desc':
      sorted.sort((a, b) => b.topDomains.length - a.topDomains.length);
      break;
    case 'results-asc':
      sorted.sort((a, b) => a.topDomains.length - b.topDomains.length);
      break;
  }

  return sorted;
}, [results, searchQuery, sortBy, minResults]);

// Add filter UI above results
{results.length > 0 && (
  <Card withBorder shadow="sm" p="md">
    <Group gap="xs" mb="md">
      <Filter size={16} />
      <Text fw={600} size="sm">Filter & Sort</Text>
      {processedResults.length !== results.length && (
        <Badge variant="light" color="blue">
          {processedResults.length} / {results.length}
        </Badge>
      )}
    </Group>

    <Stack gap="md">
      <Group gap="md" align="flex-end">
        <TextInput
          placeholder="Search keywords or domains..."
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
          placeholder="Sort by"
          data={[
            { value: 'default', label: 'Default Order' },
            { value: 'keyword', label: 'Keyword (A-Z)' },
            { value: 'results-desc', label: 'Most Results' },
            { value: 'results-asc', label: 'Least Results' },
          ]}
          value={sortBy}
          onChange={(value) => setSortBy(value as any)}
          w={180}
        />

        <NumberInput
          placeholder="Min results"
          leftSection={<Hash size={16} />}
          min={0}
          max={30}
          value={minResults}
          onChange={(value) => setMinResults(Number(value) || 0)}
          w={140}
        />

        {(searchQuery || sortBy !== 'default' || minResults > 0) && (
          <Button
            variant="light"
            color="gray"
            onClick={() => {
              setSearchQuery('');
              setSortBy('default');
              setMinResults(0);
            }}
          >
            Clear
          </Button>
        )}
      </Group>

      {/* Quick filters */}
      <Group gap="xs">
        <Text size="xs" c="dimmed">Quick filters:</Text>
        <Button
          size="xs"
          variant="light"
          onClick={() => setMinResults(20)}
        >
          High Coverage (20+)
        </Button>
        <Button
          size="xs"
          variant="light"
          onClick={() => {
            setMinResults(0);
            setSortBy('results-desc');
          }}
        >
          Best Performers
        </Button>
      </Group>
    </Stack>

    {processedResults.length === 0 && (
      <Alert icon={<Search size={16} />} title="No Results Found" color="gray" mt="md">
        No keywords match your filters.
      </Alert>
    )}
  </Card>
)}
```

**Estimated Effort:** 4-5 hours

---

### 4. Move Templates to Modal

**Same implementation as SingleCheckPage**

```typescript
const [templateModalOpened, { open: openTemplates, close: closeTemplates }] = useDisclosure(false);

// Add button to header
<Group justify="space-between" pb="md">
  <Group gap="md">
    <Layers size={20} color="var(--mantine-color-blue-6)" />
    <Box>
      <Text size="lg" fw={600}>Bulk Keyword Check</Text>
      <Text size="xs" c="dimmed">Check top 30 rankings for multiple keywords at once</Text>
    </Box>
  </Group>
  <Group gap="xs">
    {/* NEW: Template button */}
    <Button variant="light" leftSection={<FileText size={16} />} onClick={openTemplates}>
      Templates
    </Button>

    {loading && (
      <Badge variant="filled" color="blue" leftSection={<Loader2 size={12} className="animate-spin" />}>
        {progress}/{totalKeywords}
      </Badge>
    )}
  </Group>
</Group>

{/* Template Modal */}
<Modal
  opened={templateModalOpened}
  onClose={closeTemplates}
  title="Keyword Templates"
  size="xl"
>
  <BulkTemplate onUseTemplate={(keywordsText) => {
    setKeywords(keywordsText);
    closeTemplates();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }} />
</Modal>
```

**Estimated Effort:** 2-3 hours

---

## 🟡 HIGH PRIORITY IMPROVEMENTS (P1)

### 5. Add Export Options (Multiple Formats)

**Current:** Only tab-separated copy
**Proposed:** CSV, Excel, JSON formats

```typescript
<Menu shadow="md" width={200}>
  <Menu.Target>
    <Button variant="outline" size="xs" leftSection={<Download size={14} />}>
      Export All
    </Button>
  </Menu.Target>

  <Menu.Dropdown>
    <Menu.Label>Export Format</Menu.Label>
    <Menu.Item
      leftSection={<FileText size={14} />}
      onClick={() => exportBulkCSV(results)}
    >
      Export as CSV
    </Menu.Item>
    <Menu.Item
      leftSection={<FileSpreadsheet size={14} />}
      onClick={() => exportBulkExcel(results)}
    >
      Export as Excel
    </Menu.Item>
    <Menu.Item
      leftSection={<FileType size={14} />}
      onClick={() => exportBulkJSON(results)}
    >
      Export as JSON
    </Menu.Item>
    <Menu.Divider />
    <Menu.Item
      leftSection={<Copy size={14} />}
      onClick={handleCopyAll}
    >
      Copy (Tab-separated)
    </Menu.Item>
  </Menu.Dropdown>
</Menu>

function exportBulkCSV(results: BulkResult[]) {
  const rows: string[] = ['Keyword,Position,Domain,URL,Title,Checked At'];

  results.forEach(result => {
    result.topDomains.forEach(domain => {
      rows.push([
        `"${result.keyword}"`,
        domain.position,
        `"${domain.domain}"`,
        `"${domain.url}"`,
        `"${domain.title}"`,
        `"${result.checkedAt || ''}"`
      ].join(','));
    });
  });

  const csv = rows.join('\n');
  downloadFile(csv, 'bulk-ranking-results.csv', 'text/csv');

  notifications.show({
    title: 'Export Successful',
    message: `Exported ${results.length} keywords to CSV`,
    color: 'green',
    icon: <Check size={16} />,
  });
}

function exportBulkExcel(results: BulkResult[]) {
  import('xlsx').then(XLSX => {
    const data: any[] = [];

    results.forEach(result => {
      result.topDomains.forEach(domain => {
        data.push({
          'Keyword': result.keyword,
          'Position': domain.position,
          'Domain': domain.domain,
          'URL': domain.url,
          'Title': domain.title,
          'Checked At': result.checkedAt || '',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk Results');

    // Add summary sheet
    const summary = results.map(r => ({
      'Keyword': r.keyword,
      'Total Results': r.topDomains.length,
      'Top Domain': r.topDomains[0]?.domain || 'N/A',
      'Top Position': r.topDomains[0]?.position || 'N/A',
    }));

    const wsSummary = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    XLSX.writeFile(wb, 'bulk-ranking-results.xlsx');

    notifications.show({
      title: 'Export Successful',
      message: `Exported ${results.length} keywords to Excel`,
      color: 'green',
      icon: <Check size={16} />,
    });
  });
}
```

**Estimated Effort:** 4-5 hours

---

### 6. Add Keyword Performance Summary

**Feature:** Show performance metrics for each keyword

```typescript
// Calculate metrics per keyword
function getKeywordMetrics(result: BulkResult) {
  const topDomains = result.topDomains;

  const top10Count = topDomains.filter(d => d.position <= 10).length;
  const top20Count = topDomains.filter(d => d.position <= 20).length;
  const avgPosition = topDomains.length > 0
    ? topDomains.reduce((sum, d) => sum + d.position, 0) / topDomains.length
    : 0;

  // Domain diversity score (unique domains in top 10)
  const uniqueDomainsTop10 = new Set(
    topDomains.filter(d => d.position <= 10).map(d => d.domain)
  ).size;

  return {
    top10Count,
    top20Count,
    avgPosition: avgPosition.toFixed(1),
    uniqueDomainsTop10,
    competitionLevel: top10Count < 5 ? 'High' : top10Count < 8 ? 'Medium' : 'Low'
  };
}

// Add metrics to keyword card
<Card key={idx} withBorder p="md">
  <Group justify="space-between" mb={isExpanded ? "md" : 0}>
    <Group gap="xs" flex={1}>
      <ActionIcon variant="subtle" onClick={() => toggleKeyword(idx)} size="lg">
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </ActionIcon>
      <Box flex={1}>
        <Text size="sm" fw={500}>{result.keyword}</Text>

        {/* NEW: Metrics row */}
        <Group gap="md" mt={4}>
          {result.checkedAt && (
            <Group gap={4}>
              <Clock size={12} />
              <Text size="xs" c="dimmed">{result.checkedAt}</Text>
            </Group>
          )}
          <Group gap={4}>
            <FileText size={12} />
            <Text size="xs" c="dimmed">{result.topDomains.length} results</Text>
          </Group>

          {(() => {
            const metrics = getKeywordMetrics(result);
            return (
              <>
                <Group gap={4}>
                  <Trophy size={12} />
                  <Text size="xs" c="dimmed">Top 10: {metrics.top10Count}</Text>
                </Group>
                <Group gap={4}>
                  <BarChart2 size={12} />
                  <Text size="xs" c="dimmed">Avg: {metrics.avgPosition}</Text>
                </Group>
                <Badge
                  size="xs"
                  variant="light"
                  color={
                    metrics.competitionLevel === 'Low' ? 'green' :
                    metrics.competitionLevel === 'Medium' ? 'yellow' : 'red'
                  }
                >
                  {metrics.competitionLevel} Competition
                </Badge>
              </>
            );
          })()}
        </Group>
      </Box>
    </Group>

    <Group gap="xs">
      <Button onClick={() => handleCopyKeyword(result)} variant="outline" size="xs" leftSection={<Copy size={14} />}>
        Copy
      </Button>
    </Group>
  </Group>

  {/* Existing expanded table */}
  {isExpanded && (...)}
</Card>
```

**Estimated Effort:** 3-4 hours

---

### 7. Add Domain Frequency Analysis

**Feature:** Show which domains appear most across all keywords

```typescript
// Calculate domain frequency
const domainFrequency = useMemo(() => {
  const freq = new Map<string, { count: number; avgPosition: number; keywords: string[] }>();

  results.forEach(result => {
    result.topDomains.forEach(domain => {
      if (!freq.has(domain.domain)) {
        freq.set(domain.domain, { count: 0, avgPosition: 0, keywords: [] });
      }

      const data = freq.get(domain.domain)!;
      data.count++;
      data.avgPosition = (data.avgPosition * (data.count - 1) + domain.position) / data.count;
      data.keywords.push(result.keyword);
    });
  });

  return Array.from(freq.entries())
    .map(([domain, data]) => ({ domain, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}, [results]);

// Add chart after results
{results.length > 0 && (
  <Card withBorder shadow="sm" p="md">
    <Group justify="space-between" mb="md">
      <Group gap="xs">
        <Globe size={16} color="var(--mantine-color-dimmed)" />
        <Text fw={600} size="sm">Top Domains (Frequency)</Text>
      </Group>
      <Text size="xs" c="dimmed">Across {results.length} keywords</Text>
    </Group>

    <Stack gap="sm">
      {domainFrequency.map((item, idx) => (
        <Card key={idx} withBorder p="sm">
          <Group justify="space-between">
            <Group gap="xs" flex={1}>
              <Badge variant="light" color="blue">{idx + 1}</Badge>
              <Code>{item.domain}</Code>
            </Group>

            <Group gap="lg">
              <Group gap={4}>
                <Text size="xs" c="dimmed">Appears:</Text>
                <Badge variant="filled" color="green">{item.count}x</Badge>
              </Group>

              <Group gap={4}>
                <Text size="xs" c="dimmed">Avg Position:</Text>
                <Badge variant="filled" color="blue">#{item.avgPosition.toFixed(1)}</Badge>
              </Group>
            </Group>
          </Group>

          {/* Show keywords where this domain appears */}
          <Group gap={4} mt="xs">
            <Text size="xs" c="dimmed">Keywords:</Text>
            {item.keywords.slice(0, 3).map((kw, i) => (
              <Badge key={i} variant="outline" size="xs">{kw}</Badge>
            ))}
            {item.keywords.length > 3 && (
              <Text size="xs" c="dimmed">+{item.keywords.length - 3} more</Text>
            )}
          </Group>
        </Card>
      ))}
    </Stack>
  </Card>
)}
```

**Estimated Effort:** 4-5 hours

---

## 🟢 MEDIUM PRIORITY (P2)

### 8. Add Keyword Grouping

**Feature:** Group keywords by category/folder

```typescript
const [groups, setGroups] = useState<Map<string, string[]>>(new Map());
const [selectedGroup, setSelectedGroup] = useState<string>('all');

// Auto-detect groups from keywords (optional)
useEffect(() => {
  if (keywords.trim()) {
    const lines = keywords.split('\n').filter(l => l.trim());

    // Detect group headers (lines starting with ##)
    const detectedGroups = new Map<string, string[]>();
    let currentGroup = 'ungrouped';

    lines.forEach(line => {
      if (line.startsWith('##')) {
        currentGroup = line.replace('##', '').trim();
        detectedGroups.set(currentGroup, []);
      } else if (line.trim()) {
        if (!detectedGroups.has(currentGroup)) {
          detectedGroups.set(currentGroup, []);
        }
        detectedGroups.get(currentGroup)!.push(line.trim());
      }
    });

    setGroups(detectedGroups);
  }
}, [keywords]);

// Group selector UI
{groups.size > 1 && (
  <Select
    label="Filter by Group"
    data={[
      { value: 'all', label: `All Keywords (${results.length})` },
      ...Array.from(groups.keys()).map(group => ({
        value: group,
        label: `${group} (${groups.get(group)?.length || 0})`
      }))
    ]}
    value={selectedGroup}
    onChange={(value) => setSelectedGroup(value || 'all')}
  />
)}

// Filter results by group
const groupedResults = useMemo(() => {
  if (selectedGroup === 'all') return results;

  const groupKeywords = groups.get(selectedGroup) || [];
  return results.filter(r => groupKeywords.includes(r.keyword));
}, [results, selectedGroup, groups]);
```

**Example keyword input with groups:**
```
## E-commerce
online shopping
buy products online
e-commerce platform

## Marketing
digital marketing
seo services
content marketing
```

**Estimated Effort:** 5-6 hours

---

## 🔵 QUICK WINS (1-2 hours each)

### 9. Add "Export Single Keyword" Button

```typescript
// Add to each keyword card
<Menu shadow="md">
  <Menu.Target>
    <ActionIcon variant="subtle">
      <MoreVertical size={16} />
    </ActionIcon>
  </Menu.Target>

  <Menu.Dropdown>
    <Menu.Item
      leftSection={<Copy size={14} />}
      onClick={() => handleCopyKeyword(result)}
    >
      Copy (Tab-separated)
    </Menu.Item>
    <Menu.Item
      leftSection={<FileText size={14} />}
      onClick={() => exportSingleKeywordCSV(result)}
    >
      Export as CSV
    </Menu.Item>
    <Menu.Item
      leftSection={<FileSpreadsheet size={14} />}
      onClick={() => exportSingleKeywordExcel(result)}
    >
      Export as Excel
    </Menu.Item>
  </Menu.Dropdown>
</Menu>
```

---

### 10. Add Keyword Import from File

```typescript
function handleFileImport(file: File) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target?.result as string;

    // Detect format (CSV, TXT, JSON)
    if (file.name.endsWith('.json')) {
      try {
        const data = JSON.parse(text);
        const keywords = Array.isArray(data)
          ? data.map(item => typeof item === 'string' ? item : item.keyword).join('\n')
          : '';
        setKeywords(keywords);
      } catch (err) {
        notifications.show({
          title: 'Import Failed',
          message: 'Invalid JSON format',
          color: 'red',
        });
      }
    } else {
      // Assume plain text or CSV
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      setKeywords(lines.join('\n'));
    }

    notifications.show({
      title: 'Import Successful',
      message: `Imported ${keywords.split('\n').length} keywords`,
      color: 'green',
      icon: <Check size={16} />,
    });
  };

  reader.readAsText(file);
}

// Add import button
<Group justify="space-between" mb="xs">
  <Text fw={500} size="sm">Keywords (one per line)</Text>

  <FileButton onChange={handleFileImport} accept="text/plain,text/csv,application/json">
    {(props) => (
      <Button {...props} variant="subtle" size="xs" leftSection={<Upload size={14} />}>
        Import from File
      </Button>
    )}
  </FileButton>
</Group>
```

---

### 11. Add Bulk Action Checkboxes

```typescript
const [selectedKeywords, setSelectedKeywords] = useState<Set<number>>(new Set());

// Add checkbox to each card
<Checkbox
  checked={selectedKeywords.has(idx)}
  onChange={(e) => {
    const newSet = new Set(selectedKeywords);
    if (e.target.checked) {
      newSet.add(idx);
    } else {
      newSet.delete(idx);
    }
    setSelectedKeywords(newSet);
  }}
/>

// Bulk actions bar
{selectedKeywords.size > 0 && (
  <Card withBorder p="sm" bg="blue.0">
    <Group justify="space-between">
      <Text size="sm" fw={500}>
        {selectedKeywords.size} keyword{selectedKeywords.size > 1 ? 's' : ''} selected
      </Text>

      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          onClick={() => {
            const selected = results.filter((_, idx) => selectedKeywords.has(idx));
            exportBulkCSV(selected);
          }}
        >
          Export Selected
        </Button>

        <Button
          size="xs"
          variant="light"
          color="red"
          onClick={() => {
            setResults(results.filter((_, idx) => !selectedKeywords.has(idx)));
            setSelectedKeywords(new Set());
          }}
        >
          Remove Selected
        </Button>

        <Button size="xs" variant="subtle" onClick={() => setSelectedKeywords(new Set())}>
          Clear Selection
        </Button>
      </Group>
    </Group>
  </Card>
)}
```

---

## ESTIMATED TOTAL EFFORT

| Priority | Tasks | Hours |
|----------|-------|-------|
| P0 Critical | 4 tasks | 16-21h |
| P1 High | 3 tasks | 11-14h |
| P2 Medium | 1 task | 5-6h |
| Quick Wins | 3 tasks | 3-6h |
| **TOTAL** | **11 tasks** | **35-47h** |

---

## IMPLEMENTATION ORDER

1. ✅ **Add Streaming Progress** (8-10h) - Most critical
2. ✅ **Move Templates to Modal** (2-3h) - Quick improvement
3. ✅ **Add Filtering & Sorting** (4-5h) - High user value
4. ✅ **Auto-Expand First N** (2-3h) - Better UX
5. **Add Export Options** (4-5h) - Essential feature
6. **Keyword Metrics** (3-4h) - Valuable insights
7. **Domain Frequency** (4-5h) - Competitive analysis
8. **Quick Wins** (3-6h) - Low effort, high impact
9. **Keyword Grouping** (5-6h) - Advanced feature

---

## NEXT STEPS

1. Review streaming implementation approach
2. Create detailed technical spec for SSE backend
3. Test streaming with large keyword batches (50+)
4. Implement in phases starting with Quick Wins
5. User testing after P0 completion

---

**Document Version:** 1.0
**Last Updated:** February 9, 2026
