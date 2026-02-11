import { ExternalLink, Trophy } from "lucide-react";
import { Table, Badge, Stack, Text, Box, Group, Anchor, Code } from "@mantine/core";

type RankResult = {
 keyword: string;
 domain: string;
 position: number | string;
 url?: string;
 checked_at?: string;
 location_display?: string;
};

function hostFromUrl(u?: string | null) {
 if (!u || u === "-") return "-";
 try {
 return new URL(u).host || u;
 } catch {
 return u;
 }
}

export default function ResultTable({ results }: { results: RankResult[] }) {
 if (!results.length) {
 return (
 <Stack align="center" gap="md" p="xl" style={{ textAlign: 'center' }}>
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
 <Trophy size={24} color="var(--mantine-color-dimmed)" />
 </Box>
 <Text fw={600} size="sm">Chưa có kết quả</Text>
 <Text size="xs" c="dimmed">Hãy thêm từ khóa để bắt đầu kiểm tra</Text>
 </Stack>
 );
 }

 return (
 <Box>
 <Table.ScrollContainer minWidth={800}>
 <Table striped highlightOnHover>
 <Table.Thead>
 <Table.Tr>
 <Table.Th w={70} style={{ minWidth: 70 }}>#</Table.Th>
 <Table.Th>Keyword</Table.Th>
 <Table.Th>Domain</Table.Th>
 <Table.Th style={{ textAlign: 'center' }}>Rank</Table.Th>
 <Table.Th>URL</Table.Th>
 <Table.Th>Date</Table.Th>
 <Table.Th>Location</Table.Th>
 </Table.Tr>
 </Table.Thead>
 <Table.Tbody>
 {results.map((r, i) => {
 const posNum = typeof r.position === "number" ? r.position : Number(r.position);
 const isNA = Number.isNaN(posNum) || posNum <= 0;

 // Determine badge color based on ranking
 let badgeColor = "gray";
 let badgeVariant: "filled" | "light" = "light";
 if (!isNA) {
 if (posNum >= 1 && posNum <= 3) {
 badgeColor = "green";
 badgeVariant = "filled";
 } else if (posNum >= 4 && posNum <= 6) {
 badgeColor = "yellow";
 badgeVariant = "filled";
 } else if (posNum >= 7 && posNum <= 10) {
 badgeColor = "orange";
 badgeVariant = "filled";
 } else if (posNum >= 11 && posNum <= 100) {
 badgeColor = "red";
 badgeVariant = "filled";
 } else {
 badgeColor = "gray";
 badgeVariant = "light";
 }
 }

 return (
 <Table.Tr key={`${r.keyword}-${i}`}>
 <Table.Td>
 <Badge variant="light" color="gray" size="sm" circle>
 {i + 1}
 </Badge>
 </Table.Td>

 <Table.Td>
 <Text size="sm" fw={500}>
 {r.keyword}
 </Text>
 </Table.Td>

 <Table.Td>
 <Code>{r.domain}</Code>
 </Table.Td>

 <Table.Td style={{ textAlign: 'center' }}>
 <Badge variant={badgeVariant} color={badgeColor} size="sm">
 {isNA ? "N/A" : `#${posNum}`}
 </Badge>
 </Table.Td>

 <Table.Td>
 {r.url && !isNA ? (
 <Anchor
 href={r.url}
 target="_blank"
 rel="noreferrer"
 size="xs"
 style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
 >
 <Text size="xs" truncate maw={180}>{hostFromUrl(r.url)}</Text>
 <ExternalLink size={12} />
 </Anchor>
 ) : (
 <Text size="xs" c="dimmed">-</Text>
 )}
 </Table.Td>

 <Table.Td>
 <Text size="xs" c="dimmed">
 {r.checked_at || "-"}
 </Text>
 </Table.Td>

 <Table.Td>
 <Text size="xs" c="dimmed">
 {r.location_display || "-"}
 </Text>
 </Table.Td>
 </Table.Tr>
 );
 })}
 </Table.Tbody>
 </Table>
 </Table.ScrollContainer>

 {/* Footer Stats */}
 <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)', backgroundColor: 'var(--mantine-color-gray-0)' }}>
 <Group gap="xl">
 <Group gap="xs">
 <Text size="lg" fw={700} c="blue">
 {results.filter(r => {
 const pos = Number(r.position);
 return !isNaN(pos) && pos <= 30;
 }).length}
 </Text>
 <Text size="xs" c="dimmed">Top 30</Text>
 </Group>
 <Group gap="xs">
 <Text size="lg" fw={700} c="dimmed">
 {results.filter(r => {
 const pos = Number(r.position);
 return isNaN(pos);
 }).length}
 </Text>
 <Text size="xs" c="dimmed">Not ranked</Text>
 </Group>
 <Group gap="xs">
 <Text size="lg" fw={700}>
 {results.length}
 </Text>
 <Text size="xs" c="dimmed">Total checked</Text>
 </Group>
 </Group>
 </Box>
 </Box>
 );
}
