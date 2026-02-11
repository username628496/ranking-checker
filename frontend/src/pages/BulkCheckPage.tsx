import { useState, useEffect } from "react";
import {
  AlertCircle, Loader2, Monitor, Smartphone, FileText,
  ChevronDown, ChevronUp, Copy, Layers, Clock, CheckCircle, RotateCcw, LayoutGrid,
  MapPin, Rocket
} from "lucide-react";
import axios from "axios";
import { Card, Button, Textarea, Stack, Group, Box, Text, Badge, ActionIcon, Table, Anchor, Code, Alert, Modal, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import BulkTemplate from "@components/BulkTemplate";
import ProgressBar from "@components/ProgressBar";
import { API_ENDPOINTS } from "@/config/api";
import { getCurrentVietnameseTimestamp } from "@/utils/dateFormatter";
import { getErrorMessage } from "@/utils/errorHandler";

interface BulkResult {
  keyword: string;
  topDomains: Array<{
    position: number;
    domain: string;
    url: string;
    title: string;
  }>;
  checkedAt?: string;
}

const deviceOptions = [
  { value: "desktop", label: "Desktop", icon: Monitor },
  { value: "mobile", label: "Mobile", icon: Smartphone },
] as const;

const locationOptions = [
  { value: "vn", label: "Việt Nam", shortLabel: "VN" },
  { value: "hanoi", label: "Hà Nội", shortLabel: "HN" },
  { value: "hochiminh", label: "Hồ Chí Minh", shortLabel: "HCM" },
  { value: "danang", label: "Đà Nẵng", shortLabel: "DN" },
] as const;

const STORAGE_KEY = "bulk_check_state";

export default function BulkCheckPage() {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("vn");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [expandedKeywords, setExpandedKeywords] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [totalKeywords, setTotalKeywords] = useState(0);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        const hasResults = state.results && state.results.length > 0;

        setKeywords(state.keywords || "");
        setLocation(state.location || "vn");
        setDevice(state.device || "desktop");
        setResults(state.results || []);

        // Show notification if data was restored
        if (hasResults) {
          notifications.show({
            title: "Data Restored",
            message: `Restored ${state.results.length} previous results`,
            color: "blue",
            icon: <RotateCcw size={16} />,
            autoClose: 3000,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load saved state:", err);
    }
    setIsInitialized(true);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        keywords,
        location,
        device,
        results,
      }));
    } catch (err) {
      console.error("Failed to save state:", err);
    }
  }, [keywords, location, device, results, isInitialized]);

  function handleUseTemplate(keywordsText: string) {
    setKeywords(keywordsText);
    setTemplateModalOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleKeyword(idx: number) {
    setExpandedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedKeywords(new Set(results.map((_, idx) => idx)));
  }

  function collapseAll() {
    setExpandedKeywords(new Set());
  }

  function handleCopyKeyword(result: BulkResult) {
    const timestamp = getCurrentVietnameseTimestamp();
    const lines = result.topDomains.slice(0, 30).map((d) =>
      `${timestamp}\t${result.keyword}\t${d.position}\t${d.title}\t${d.domain}\t${d.url}`
    );
    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    notifications.show({
      message: `Copied: ${result.keyword}`,
      color: 'green',
      icon: <CheckCircle size={16} />,
    });
  }

  function handleCopyAll() {
    const timestamp = getCurrentVietnameseTimestamp();
    const allLines: string[] = [];
    results.forEach((result) => {
      result.topDomains.slice(0, 30).forEach((d) => {
        allLines.push(`${timestamp}\t${result.keyword}\t${d.position}\t${d.title}\t${d.domain}\t${d.url}`);
      });
    });
    navigator.clipboard.writeText(allLines.join('\n'));
    notifications.show({
      message: `Copied all results (${results.length} keywords)`,
      color: 'green',
      icon: <CheckCircle size={16} />,
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keywords.trim()) {
      setError("Vui lòng nhập ít nhất một từ khóa");
      return;
    }

    // Fix Windows line ending bug (\r\n vs \n)
    const keywordList = keywords
      .split(/\r?\n/)  // Handle both Unix (\n) and Windows (\r\n) line endings
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

    try {
      const timestamp = getCurrentVietnameseTimestamp();

      // Call API once with all keywords (most efficient - saves credits)
      const response = await axios.post(API_ENDPOINTS.BULK_CHECK, {
        keywords: keywordList,
        location,
        device,
        limit: 30,
      });

      // Add timestamp to each result
      const resultsWithTimestamp = response.data.results.map((r: BulkResult) => ({
        ...r,
        checkedAt: timestamp
      }));

      setResults(resultsWithTimestamp);
      setProgress(keywordList.length);
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Có lỗi xảy ra khi kiểm tra");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ height: '100%', overflow: 'auto' }} p="md">
      <Stack gap="md" maw={1200} mx="auto">
        {/* Header */}
        <Group justify="space-between" pb="md" style={{ borderBottom: '2px solid var(--mantine-color-blue-1)' }}>
          <Group gap="md">
            <Layers size={24} color="var(--mantine-color-blue-6)" />
            <Box>
              <Text size="lg" fw={700} c="blue">Bulk Keyword Check</Text>
              <Text size="xs" c="dimmed">Check top 30 rankings for multiple keywords at once</Text>
            </Box>
          </Group>
          <Group gap="xs">
            {loading && (
              <Badge
                variant="filled"
                color="blue"
                leftSection={<Loader2 size={12} className="animate-spin" />}
              >
                {progress}/{totalKeywords}
              </Badge>
            )}
            <Button
              size="xs"
              variant="filled"
              color="blue"
              leftSection={<LayoutGrid size={14} />}
              onClick={() => setTemplateModalOpen(true)}
            >
              Templates
            </Button>
          </Group>
        </Group>

        {/* Form */}
        <Card withBorder shadow="sm" p="md">
          <Group gap="xs" mb="md">
            <Rocket size={16} color="var(--mantine-color-orange-6)" />
            <Text fw={600} size="sm">Cấu hình kiểm tra</Text>
          </Group>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {/* Keywords Input with Device/Location Controls */}
              <Box>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">Keywords (one per line)</Text>
                  <Group gap={4}>
                    {/* Device Selection - Icon Only */}
                    {deviceOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = device === opt.value;
                      return (
                        <Tooltip key={opt.value} label={opt.label} position="bottom">
                          <ActionIcon
                            variant={isActive ? "filled" : "outline"}
                            color="orange"
                            size="lg"
                            onClick={() => setDevice(opt.value)}
                          >
                            <Icon size={16} />
                          </ActionIcon>
                        </Tooltip>
                      );
                    })}

                    <Box style={{ width: 1, height: 24, backgroundColor: 'var(--mantine-color-gray-3)', margin: '0 4px' }} />

                    {/* Location Selection - Icon Only */}
                    {locationOptions.map((opt) => {
                      const isActive = location === opt.value;
                      return (
                        <Tooltip key={opt.value} label={opt.label} position="bottom">
                          <ActionIcon
                            variant={isActive ? "filled" : "outline"}
                            color="orange"
                            size="lg"
                            onClick={() => setLocation(opt.value)}
                          >
                            <MapPin size={16} />
                          </ActionIcon>
                        </Tooltip>
                      );
                    })}
                  </Group>
                </Group>

                <Textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="seo tools&#10;digital marketing&#10;content strategy"
                  rows={7}
                  styles={{ input: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
                />
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                color="orange"
                fullWidth
                leftSection={loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              >
                {loading ? `Checking... (${progress}/${totalKeywords})` : 'Start Bulk Check'}
              </Button>
            </Stack>
          </form>
        </Card>

        {/* Progress */}
        {(loading || results.length > 0) && (
          <Card withBorder shadow="sm" p="md">
            <ProgressBar
              done={progress}
              total={totalKeywords || progress}
              current={loading && results.length > 0 ? { keyword: results[results.length - 1].keyword } : null}
              statusText={
                error
                  ? `Error: ${error}`
                  : !loading && results.length > 0
                  ? "Completed"
                  : loading
                  ? "Checking..."
                  : "Preparing..."
              }
              ended={!loading && results.length > 0}
            />
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Alert color="red" icon={<AlertCircle size={16} />} title="Error Occurred">
            {error}
          </Alert>
        )}

        {/* Empty State */}
        {results.length === 0 && !loading && (
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
                <Layers size={24} color="var(--mantine-color-gray-6)" />
              </Box>
              <Text fw={600} size="sm">No results yet</Text>
              <Text size="xs" c="dimmed" ta="center" maw={300}>
                Enter keywords above to check top 30 rankings for multiple keywords at once
              </Text>
            </Stack>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card withBorder shadow="md" p="lg" radius="md">
            {/* Header with Actions */}
            <Group justify="space-between" mb="xl" pb="md" style={{ borderBottom: '2px solid var(--mantine-color-green-1)' }}>
              <Group gap="sm">
                <CheckCircle size={20} color="var(--mantine-color-green-6)" />
                <Box>
                  <Text fw={600} size="md">Results</Text>
                  <Text size="xs" c="dimmed">{results.length} keywords checked</Text>
                </Box>
              </Group>
              <Group gap="xs">
                <Tooltip label="Expand all results">
                  <ActionIcon variant="subtle" color="gray" size="lg" onClick={expandAll}>
                    <ChevronDown size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Collapse all results">
                  <ActionIcon variant="subtle" color="gray" size="lg" onClick={collapseAll}>
                    <ChevronUp size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Copy all results">
                  <ActionIcon variant="subtle" color="gray" size="lg" onClick={handleCopyAll}>
                    <Copy size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            {/* Results List */}
            <Stack gap="md">
              {results.map((result, idx) => {
                const isExpanded = expandedKeywords.has(idx);

                return (
                  <Card
                    key={idx}
                    withBorder
                    shadow="xs"
                    p="md"
                    radius="md"
                    style={{
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      '&:hover': {
                        shadow: 'md',
                        transform: 'translateY(-2px)',
                      }
                    }}
                  >
                    <Group justify="space-between" mb={isExpanded ? "md" : 0} onClick={() => toggleKeyword(idx)}>
                      <Group gap="md" flex={1}>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="lg"
                          radius="md"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </ActionIcon>
                        <Box flex={1}>
                          <Group gap="xs" mb={4}>
                            <Text size="sm" fw={600}>{result.keyword}</Text>
                            <Badge variant="light" color="orange" size="sm">
                              {result.topDomains.length}
                            </Badge>
                          </Group>
                          <Group gap="lg">
                            {result.checkedAt && (
                              <Group gap={6}>
                                <Clock size={14} color="var(--mantine-color-blue-6)" />
                                <Text size="xs" c="dimmed">{result.checkedAt}</Text>
                              </Group>
                            )}
                            <Group gap={6}>
                              <FileText size={14} color="var(--mantine-color-gray-6)" />
                              <Text size="xs" c="dimmed">Top 30 domains</Text>
                            </Group>
                          </Group>
                        </Box>
                      </Group>
                      <Tooltip label="Copy keyword results">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyKeyword(result);
                          }}
                        >
                          <Copy size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>

                    {isExpanded && (
                      <Box
                        style={{
                          borderTop: '1px solid var(--mantine-color-gray-2)',
                          marginTop: 'var(--mantine-spacing-md)',
                          paddingTop: 'var(--mantine-spacing-md)',
                        }}
                      >
                        <Table.ScrollContainer minWidth={600}>
                          <Table striped highlightOnHover withTableBorder withColumnBorders>
                            <Table.Thead>
                              <Table.Tr style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                <Table.Th w={80} style={{ fontWeight: 600 }}>Rank</Table.Th>
                                <Table.Th w={180} style={{ fontWeight: 600 }}>Domain</Table.Th>
                                <Table.Th style={{ fontWeight: 600 }}>Title</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {result.topDomains.slice(0, 30).map((domain, domainIdx) => {
                                const displayRank = domainIdx + 1;

                                let badgeColor = "gray";
                                if (displayRank <= 3) {
                                  badgeColor = "green";
                                } else if (displayRank <= 10) {
                                  badgeColor = "cyan";
                                } else if (displayRank <= 20) {
                                  badgeColor = "orange";
                                } else {
                                  badgeColor = "red";
                                }

                                return (
                                  <Table.Tr key={domainIdx} style={{ transition: 'background-color 0.1s' }}>
                                    <Table.Td>
                                      <Badge variant="filled" color={badgeColor} size="md" radius="sm">
                                        #{displayRank}
                                      </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                      <Code style={{ fontSize: '0.8rem' }}>{domain.domain}</Code>
                                    </Table.Td>
                                    <Table.Td>
                                      <Anchor
                                        href={domain.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="sm"
                                        lineClamp={2}
                                        style={{ lineHeight: 1.4 }}
                                      >
                                        {domain.title}
                                      </Anchor>
                                    </Table.Td>
                                  </Table.Tr>
                                );
                              })}
                            </Table.Tbody>
                          </Table>
                        </Table.ScrollContainer>
                      </Box>
                    )}
                  </Card>
                );
              })}
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
        <BulkTemplate onUseTemplate={handleUseTemplate} />
      </Modal>
    </Box>
  );
}
