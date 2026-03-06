import { useState, useEffect, useRef } from "react";
import {
  AlertCircle, Monitor, Smartphone, FileText,
  ChevronDown, ChevronUp, Copy, Layers, Clock, CheckCircle, RotateCcw, LayoutGrid,
  MapPin, Rocket, Loader2
} from "lucide-react";
import axios from "axios";
import { Card, Button, Textarea, Stack, Group, Box, Text, Badge, ActionIcon, Table, Anchor, Code, Alert, Modal, Tooltip, SegmentedControl } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import BulkTemplate from "@components/BulkTemplate";
import PageHeader from "@components/PageHeader";
import Footer from "@components/Footer";
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
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const hasShownNotificationRef = useRef(false);

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

        // Show notification if data was restored (only once)
        if (hasResults && !hasShownNotificationRef.current) {
          hasShownNotificationRef.current = true;
          notifications.show({
            message: `${state.results.length} results restored`,
            color: "blue",
            icon: <RotateCcw size={14} />,
            autoClose: 2000,
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
      icon: <CheckCircle size={14} />,
      autoClose: 2000,
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
      message: `${results.length} keywords copied`,
      color: 'green',
      icon: <CheckCircle size={14} />,
      autoClose: 2000,
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

    try {
      const timestamp = getCurrentVietnameseTimestamp();

      // Get API key from localStorage
      const apiKey = localStorage.getItem("serper_api_key");
      if (!apiKey) {
        setError("Please configure your Serper API key in Settings first");
        setLoading(false);
        return;
      }

      // Call API once with all keywords (most efficient - saves credits)
      const response = await axios.post(API_ENDPOINTS.BULK_CHECK, {
        keywords: keywordList,
        location,
        device,
        limit: 30,
        api_key: apiKey,
      });

      // Add timestamp to each result
      const resultsWithTimestamp = response.data.results.map((r: BulkResult) => ({
        ...r,
        checkedAt: timestamp
      }));

      setResults(resultsWithTimestamp);
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Có lỗi xảy ra khi kiểm tra");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box style={{ flex: 1, overflow: 'auto' }} p="md">
        <Stack gap="md" maw={1200} mx="auto">
          <PageHeader
            icon={<Layers size={28} />}
            title="Bulk Keyword Check"
            description="Check top rankings for multiple keywords at once (up to 30 results per keyword)"
            color="#ec4899"
            actions={
              <Button
                size="xs"
                variant="white"
                c="dark"
                leftSection={<LayoutGrid size={14} />}
                onClick={() => setTemplateModalOpen(true)}
              >
                Templates
              </Button>
            }
          />

        {/* Form */}
        <Card withBorder shadow="sm" p="md">
          <Group gap="xs" mb="md">
            <Clock size={16} color="var(--mantine-color-dimmed)" />
            <Text fw={600} size="sm">New Check</Text>
          </Group>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {/* Device Selection */}
              <Stack gap="xs">
                <Group gap={6}>
                  <Monitor size={16} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" fw={500}>Device</Text>
                </Group>
                <SegmentedControl
                  value={device}
                  onChange={(val) => setDevice(val as "desktop" | "mobile")}
                  data={deviceOptions.map((opt) => ({
                    value: opt.value,
                    label: (
                      <Group gap={6} justify="center">
                        <opt.icon size={14} />
                        <Text size="sm">{opt.label}</Text>
                      </Group>
                    ),
                  }))}
                  fullWidth
                  color="blue"
                />
              </Stack>

              {/* Location Selection */}
              <Stack gap="xs">
                <Group gap={6}>
                  <MapPin size={16} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" fw={500}>Location</Text>
                </Group>
                <SegmentedControl
                  value={location}
                  onChange={setLocation}
                  data={locationOptions.map((opt) => ({
                    value: opt.value,
                    label: (
                      <Tooltip label={opt.label} position="bottom" withinPortal>
                        <Text size="sm">{opt.shortLabel}</Text>
                      </Tooltip>
                    ),
                  }))}
                  fullWidth
                  color="green"
                />
              </Stack>

              {/* Keywords Input */}
              <Box>
                <Group gap={6} mb="xs">
                  <Text size="sm" c="dimmed">Keywords (one per line)</Text>
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
                disabled={loading || keywords.trim() === ""}
                fullWidth
                size="md"
                mt="md"
                leftSection={loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              >
                {loading ? 'Checking...' : 'Start Bulk Check'}
              </Button>
            </Stack>
          </form>
        </Card>

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
                Enter keywords above to check rankings for multiple keywords at once (fetches up to 30 results per keyword)
              </Text>
            </Stack>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card withBorder shadow="sm">
            <Card.Section p="md" withBorder>
              <Group justify="space-between">
                <Group gap="xs">
                  <CheckCircle size={16} color="var(--mantine-color-dimmed)" />
                  <Text fw={600} size="sm">Results</Text>
                  <Badge variant="light">{results.length}</Badge>
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
            </Card.Section>

            {/* Results List */}
            <Card.Section p="md">
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
                              <Text size="xs" c="dimmed">
                                {result.topDomains.length} {result.topDomains.length === 1 ? 'result' : 'results'}
                                {result.topDomains.length < 30 && (
                                  <Text component="span" c="orange" ml={4}>
                                    (limited by search engine)
                                  </Text>
                                )}
                              </Text>
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
                      <Box pt="md" mt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
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

                                // Ranking color map - CLAUDE.md Section 5
                                let badgeColor = "gray";
                                if (displayRank <= 6) {
                                  badgeColor = "green";
                                } else if (displayRank <= 10) {
                                  badgeColor = "yellow";
                                } else if (displayRank <= 20) {
                                  badgeColor = "gray";
                                } else if (displayRank <= 50) {
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
            </Card.Section>
          </Card>
        )}
        </Stack>
      </Box>

      <Footer />

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
