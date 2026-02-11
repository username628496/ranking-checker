import { useMemo, useState, useEffect, useRef } from "react";
import Form from "@components/Form";
import ProgressBar from "@components/ProgressBar";
import ResultTable from "@components/ResultTable";
import UserTemplate from "@components/UserTemplate";
import TopHighlights from "@components/TopHighlights";
import { PositionChart } from "@components/PositionChart";
import { useSSE, type RankResult } from "@hooks/useSSE";
import { usePersistedState } from "@hooks/useLocalStorage";
import {
  AlertTriangle,
  TrendingUp,
  Target,
  Award,
  Activity,
  Clock,
  CheckCircle2,
  FileText,
  RotateCcw,
  Trash2,
  XCircle,
  Download,
  Filter,
  LayoutGrid,
} from "lucide-react";
import { Card, Badge, Text, Group, Stack, Alert, Box, ActionIcon, Tooltip, Button, Modal, Menu } from "@mantine/core";
import { notifications } from "@mantine/notifications";

const STORAGE_KEY = "single_check_state";

export default function SingleCheckPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expectedTotal, setExpectedTotal] = useState<number>(0);
  const [templateData, setTemplateData] = useState<{ keywords: string; domains: string } | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [filterPosition, setFilterPosition] = useState<"all" | "top10" | "top30" | "below30">("all");

  // Persist state to localStorage
  const { state: persistedState, setState: setPersistedState, clearState } = usePersistedState(STORAGE_KEY, {
    results: [] as RankResult[],
    lastSessionId: null as string | null,
    lastExpectedTotal: 0,
    timestamp: null as number | null,
  });

  const { results, error, status, setResults, setError, cancel } = useSSE(sessionId, {
    autoClear: false, // Don't auto-clear so we can persist
  });

  const done = results.length;
  const current = results.length ? results[results.length - 1] : null;

  // Ref to prevent duplicate restoration
  const restoredRef = useRef(false);

  // Load persisted data on mount
  useEffect(() => {
    // Restore results if available and recent (less than 24 hours)
    if (persistedState.results.length > 0 && results.length === 0 && !restoredRef.current) {
      const timeDiff = persistedState.timestamp ? Date.now() - persistedState.timestamp : Infinity;
      const isRecent = timeDiff < 24 * 60 * 60 * 1000;

      if (isRecent) {
        restoredRef.current = true;
        setResults(persistedState.results);
        setExpectedTotal(persistedState.lastExpectedTotal);

        notifications.show({
          title: "Data Restored",
          message: `Restored ${persistedState.results.length} previous results`,
          color: "blue",
          icon: <RotateCcw size={16} />,
          autoClose: 3000,
        });
      }
    }
  }, [persistedState.results.length, results.length]);

  // Debounced save to localStorage (reduces writes from 100+ to ~10)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (results.length > 0) {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce: only save after 1 second of no new results
      saveTimeoutRef.current = setTimeout(() => {
        setPersistedState({
          results: results as RankResult[],
          lastSessionId: sessionId,
          lastExpectedTotal: expectedTotal,
          timestamp: Date.now(),
        });
      }, 1000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [results, sessionId, expectedTotal, setPersistedState]);

  const topHighlights = useMemo(
    () =>
      results.filter((r) => {
        const pos = typeof r.position === "number" ? r.position : Number(r.position);
        return !isNaN(pos) && pos > 0 && pos <= 100;
      }),
    [results]
  );

  const filteredResults = useMemo(() => {
    if (filterPosition === "all") return results;
    return results.filter((r) => {
      const pos = typeof r.position === "number" ? r.position : Number(r.position);
      if (filterPosition === "top10") return pos <= 10;
      if (filterPosition === "top30") return pos <= 30;
      if (filterPosition === "below30") return pos > 30;
      return true;
    });
  }, [results, filterPosition]);

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

  function handleUseTemplate(keywords: string, domains: string) {
    setTemplateData({ keywords, domains });
    setTimeout(() => setTemplateData(null), 100);
    setTemplateModalOpen(false);
  }

  function handleClearResults() {
    setResults([]);
    setExpectedTotal(0);
    setSessionId(null);
    clearState();
    notifications.show({
      title: "Results Cleared",
      message: "All results have been cleared",
      color: "gray",
      autoClose: 2000,
    });
  }

  function handleCancel() {
    cancel();
    setSessionId(null);
    notifications.show({
      title: "Check Cancelled",
      message: `Stopped at ${results.length} of ${expectedTotal} results`,
      color: "orange",
      icon: <XCircle size={16} />,
      autoClose: 3000,
    });
  }

  function handleExportCSV() {
    const headers = ["Keyword", "Domain", "Position", "URL", "Location", "Checked At"];
    const rows = filteredResults.map((r) => [
      r.keyword,
      r.domain,
      r.position,
      r.url || "N/A",
      r.location_display || "N/A",
      r.checked_at || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ranking-results-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notifications.show({
      title: "Export Successful",
      message: `Exported ${filteredResults.length} results to CSV`,
      color: "green",
      icon: <Download size={16} />,
      autoClose: 3000,
    });
  }

  return (
    <Box style={{ height: '100%', overflow: 'auto' }} p="md">
      <Stack gap="md" maw={1200} mx="auto">
        {/* Compact Header */}
        <Group justify="space-between" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
          <Group gap="md">
            <Target size={20} color="var(--mantine-color-blue-6)" />
            <Box>
              <Text size="lg" fw={600}>Keyword Rank Checker</Text>
              <Text size="xs" c="dimmed">Track rankings in real-time</Text>
            </Box>
          </Group>
          <Group gap="xs">
            {(status === "streaming" || status === "connecting") && (
              <>
                <Badge variant="filled" color="blue" leftSection={<Activity size={12} />}>
                  {status === "connecting" ? "Connecting" : "Live"}
                </Badge>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<XCircle size={14} />}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </>
            )}
            <Button
              size="xs"
              variant="light"
              leftSection={<LayoutGrid size={14} />}
              onClick={() => setTemplateModalOpen(true)}
            >
              Templates
            </Button>
            {results.length > 0 && status !== "streaming" && (
              <Tooltip label="Clear all results">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={handleClearResults}
                  size="lg"
                >
                  <Trash2 size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>


        {/* Form Section */}
        <Card withBorder shadow="sm" p="md">
          <Group gap="xs" mb="md">
            <Clock size={16} color="var(--mantine-color-dimmed)" />
            <Text fw={600} size="sm">New Check</Text>
          </Group>
          <Form
            onStart={handleStart}
            onError={(msg) => setError(msg)}
            initialKeywords={templateData?.keywords}
            initialDomains={templateData?.domains}
            isStreaming={status === "streaming" || status === "connecting"}
          />
        </Card>

        {/* Progress */}
        {(expectedTotal > 0 || results.length > 0) && (
          <Card withBorder shadow="sm" p="md">
            <ProgressBar
              done={done}
              total={expectedTotal || done}
              current={current ? { keyword: current.keyword, domain: current.domain } : null}
              statusText={
                status === "error"
                  ? `Error: ${error}`
                  : status === "ended" || (results.length > 0 && !sessionId)
                  ? "Completed"
                  : status === "streaming"
                  ? "Checking..."
                  : "Preparing..."
              }
              ended={status === "ended" || (results.length > 0 && !sessionId)}
            />
          </Card>
        )}

        {/* Error */}
        {status === "error" && (
          <Alert color="red" icon={<AlertTriangle size={16} />} title="Error Occurred">
            {error}
          </Alert>
        )}

        {/* Top Rankings Highlight */}
        {topHighlights.length > 0 && (
          <Card withBorder shadow="sm" p="md">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <Award size={16} color="var(--mantine-color-dimmed)" />
                <Text fw={600} size="sm">Rankings (1-100)</Text>
              </Group>
              <Badge variant="outline" leftSection={<TrendingUp size={12} />}>
                {topHighlights.length}
              </Badge>
            </Group>
            <TopHighlights topHighlights={topHighlights} />
          </Card>
        )}

        {/* Position Distribution Chart */}
        {results.length > 0 && (
          <Card withBorder shadow="sm" p="md">
            <PositionChart results={results as RankResult[]} />
          </Card>
        )}

        {/* All Results */}
        {results.length > 0 && (
          <Card withBorder shadow="sm">
            <Card.Section p="md" withBorder>
              <Group justify="space-between">
                <Group gap="xs">
                  <CheckCircle2 size={16} color="var(--mantine-color-dimmed)" />
                  <Text fw={600} size="sm">All Results</Text>
                  <Badge variant="light">
                    {filteredResults.length}
                    {filterPosition !== "all" && ` / ${results.length}`}
                  </Badge>
                </Group>
                <Group gap="xs">
                  <Menu position="bottom-end">
                    <Menu.Target>
                      <Button
                        size="xs"
                        variant={filterPosition === "all" ? "subtle" : "light"}
                        leftSection={<Filter size={14} />}
                      >
                        {filterPosition === "all" && "Filter"}
                        {filterPosition === "top10" && "Top 10"}
                        {filterPosition === "top30" && "Top 30"}
                        {filterPosition === "below30" && "Below 30"}
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item onClick={() => setFilterPosition("all")}>
                        All Results ({results.length})
                      </Menu.Item>
                      <Menu.Item onClick={() => setFilterPosition("top10")}>
                        Top 10 ({results.filter(r => {
                          const pos = typeof r.position === "number" ? r.position : Number(r.position);
                          return pos <= 10;
                        }).length})
                      </Menu.Item>
                      <Menu.Item onClick={() => setFilterPosition("top30")}>
                        Top 30 ({results.filter(r => {
                          const pos = typeof r.position === "number" ? r.position : Number(r.position);
                          return pos <= 30;
                        }).length})
                      </Menu.Item>
                      <Menu.Item onClick={() => setFilterPosition("below30")}>
                        Below 30 ({results.filter(r => {
                          const pos = typeof r.position === "number" ? r.position : Number(r.position);
                          return pos > 30;
                        }).length})
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                  <Button
                    size="xs"
                    variant="light"
                    color="green"
                    leftSection={<Download size={14} />}
                    onClick={handleExportCSV}
                  >
                    Export CSV
                  </Button>
                </Group>
              </Group>
            </Card.Section>
            <Card.Section>
              <ResultTable results={filteredResults as RankResult[]} />
            </Card.Section>
          </Card>
        )}

        {/* Empty State */}
        {results.length === 0 && status !== "streaming" && (
          <Card withBorder shadow="sm" p="xl">
            <Stack align="center" gap="md">
              <Box
                style={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--mantine-radius-md)',
                  backgroundColor: 'var(--mantine-color-gray-1)'
                }}
              >
                <Target size={24} color="var(--mantine-color-dimmed)" />
              </Box>
              <Text fw={600} size="sm">No results yet</Text>
              <Text size="xs" c="dimmed" ta="center" maw={300}>
                Enter keywords and domains above to start checking rankings
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>

      {/* Template Modal */}
      <Modal
        opened={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={
          <Group gap="xs">
            <FileText size={18} />
            <Text fw={600}>Saved Templates</Text>
          </Group>
        }
        size="xl"
      >
        <UserTemplate onUseTemplate={handleUseTemplate} />
      </Modal>
    </Box>
  );
}
