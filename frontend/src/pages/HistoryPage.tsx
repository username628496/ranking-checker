import { useState, useEffect } from "react";
import { ClipboardList, Home, Trophy, Tag, Globe, CheckCircle, XCircle, Coins, AlertCircle, Clock } from "lucide-react";
import axios from "axios";
import { Card, Stack, Group, Box, Text, Badge, Table, Loader, Pagination, Alert } from "@mantine/core";
import PageHeader from "@components/PageHeader";
import Footer from "@components/Footer";
import { API_ENDPOINTS } from "@/config/api";
import { formatSessionDateTime } from "@/utils/dateFormatter";
import { getErrorMessage } from "@/utils/errorHandler";

interface Session {
  session_id: string;
  check_type: "single" | "bulk";
  checked_at: string;
  keyword_count: number;
  domain_count: number;
  total_records: number;
  api_credits_used: number;
  success: boolean;
  location: string;
  device: string;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  useEffect(() => {
    loadSessions(page);
  }, [page]);

  // Auto-reload when component mounts or page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 History page visible - reloading sessions');
        loadSessions(page);
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [page]);

  const loadSessions = async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_ENDPOINTS.HISTORY_SESSIONS, {
        params: {
          page: pageNum,
          per_page: perPage,
        },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      setSessions(response.data.sessions || []);
      setTotalPages(response.data.total_pages || 1);
      setTotal(response.data.total || 0);
      setPage(response.data.page || 1);

      // Debug logging
      const singleCount = response.data.sessions.filter((s: Session) => s.check_type === 'single').length;
      const bulkCount = response.data.sessions.filter((s: Session) => s.check_type === 'bulk').length;
      console.log(`✅ History loaded: Page ${pageNum}, Total ${response.data.total}, Single: ${singleCount}, Bulk: ${bulkCount}`);
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to load history sessions");
      setError(errorMessage);
      console.error("Error loading sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const locationLabels: Record<string, string> = {
    vn: "Nationwide",
    hanoi: "Hanoi",
    hochiminh: "Ho Chi Minh",
    danang: "Da Nang",
  };

  const getCheckTypeIcon = (checkType: string) => {
    return checkType === "bulk" ? <Trophy size={14} /> : <Home size={14} />;
  };

  const getCheckTypeLabel = (checkType: string) => {
    return checkType === "bulk" ? "30 Ranking" : "Home";
  };

  const getCheckTypeBadgeColor = (checkType: string) => {
    return checkType === "bulk" ? "blue" : "green";
  };

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box style={{ flex: 1, overflow: 'auto' }} p="md">
        <Stack gap="md" maw={1200} mx="auto">
          <PageHeader
            icon={<Clock size={28} />}
            title="Check History"
            description="View and manage your previous ranking checks"
            color="#3b82f6"
          />

        {/* Error Message */}
        {error && (
          <Alert color="red" icon={<AlertCircle size={16} />} title="Error Loading Sessions">
            {error}
          </Alert>
        )}

        {/* Sessions Table */}
        <Card withBorder shadow="sm" p="md">
          <Group gap="xs" mb="md">
            <ClipboardList size={16} color="var(--mantine-color-dimmed)" />
            <Text fw={600} size="sm">Sessions ({sessions.length})</Text>
          </Group>

          {loading ? (
            <Stack align="center" gap="md" py="xl">
              <Loader size="lg" />
              <Text size="sm" c="dimmed">Loading sessions...</Text>
            </Stack>
          ) : error ? (
            <Stack align="center" gap="md" py="xl">
              <Box
                style={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--mantine-radius-md)',
                  backgroundColor: 'var(--mantine-color-red-0)'
                }}
              >
                <AlertCircle size={24} color="var(--mantine-color-red-6)" />
              </Box>
              <Text fw={600} size="sm">Failed to load sessions</Text>
              <Text size="xs" c="dimmed">Please try refreshing the page</Text>
            </Stack>
          ) : sessions.length === 0 ? (
            <Stack align="center" gap="md" py="xl">
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
                <ClipboardList size={24} color="var(--mantine-color-dimmed)" />
              </Box>
              <Text fw={600} size="sm">No check sessions found</Text>
              <Text size="xs" c="dimmed" ta="center" maw={300}>
                Your check history will appear here once you start ranking checks
              </Text>
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={900}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date & Time</Table.Th>
                    <Table.Th>Check Type</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Keywords</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Domains</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Status</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>API Credits</Table.Th>
                    <Table.Th>Location</Table.Th>
                    <Table.Th>Device</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sessions.map((session) => (
                    <Table.Tr key={session.session_id}>
                      <Table.Td>
                        <Text size="xs">
                          {formatSessionDateTime(session.checked_at)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={getCheckTypeBadgeColor(session.check_type)}
                          leftSection={getCheckTypeIcon(session.check_type)}
                        >
                          {getCheckTypeLabel(session.check_type)}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge variant="light" color="blue" leftSection={<Tag size={12} />}>
                          {session.keyword_count}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge variant="light" color="violet" leftSection={<Globe size={12} />}>
                          {session.domain_count}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge
                          variant="light"
                          color={session.success ? "green" : "red"}
                          leftSection={session.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        >
                          {session.success ? "Success" : "Failed"}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge variant="light" color="orange" leftSection={<Coins size={12} />}>
                          {session.api_credits_used}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {locationLabels[session.location] || session.location}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {session.device === "desktop" ? "Desktop" : "Mobile"}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="center">
            <Pagination
              value={page}
              onChange={setPage}
              total={totalPages}
              size="md"
              withEdges
            />
          </Group>
        )}

        {/* Summary */}
        {total > 0 && (
          <Text size="xs" c="dimmed" ta="center">
            Showing {sessions.length} of {total} sessions
          </Text>
        )}
        </Stack>
      </Box>

      <Footer />
    </Box>
  );
}
