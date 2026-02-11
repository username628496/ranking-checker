import { useState, useEffect } from "react";
import { ClipboardList, Home, Trophy, Tag, Globe, CheckCircle, XCircle, Coins, AlertCircle } from "lucide-react";
import axios from "axios";
import { Card, Stack, Group, Box, Text, Badge, Table, Loader, Pagination, Alert } from "@mantine/core";
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

  const loadSessions = async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_ENDPOINTS.HISTORY_SESSIONS, {
        params: {
          page: pageNum,
          per_page: perPage,
        },
      });
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
    <Box style={{ height: '100%', overflow: 'auto' }} p="md">
      <Stack gap="md" maw={1200} mx="auto">
        {/* Header */}
        <Group justify="space-between" pb="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
          <Group gap="md">
            <ClipboardList size={20} color="var(--mantine-color-blue-6)" />
            <Box>
              <Text size="lg" fw={600}>Check History</Text>
              <Text size="xs" c="dimmed">View all your previous check sessions</Text>
            </Box>
          </Group>
        </Group>

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
              <Text size="sm" c="dimmed">Loading...</Text>
            </Stack>
          ) : error ? (
            <Stack align="center" gap="md" py="xl">
              <AlertCircle size={48} color="var(--mantine-color-red-6)" />
              <Text size="sm" c="dimmed">Failed to load sessions</Text>
            </Stack>
          ) : sessions.length === 0 ? (
            <Stack align="center" gap="md" py="xl">
              <ClipboardList size={48} color="var(--mantine-color-dimmed)" />
              <Text size="sm" c="dimmed">No check sessions found</Text>
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
  );
}
