import { Crown, Medal, Award, Star, ExternalLink } from "lucide-react";
import { SimpleGrid, Card, Group, Badge, Text, Anchor, Code, Box, Stack } from "@mantine/core";
import type { RankResult } from "@hooks/useSSE";

function getRankIcon(position: number) {
  if (position <= 3) return Crown;
  if (position <= 6) return Medal;
  if (position <= 10) return Award;
  return Star;
}

function hostFromUrl(u?: string | null) {
  if (!u || u === "-") return "-";
  try {
    return new URL(u).host || u;
  } catch {
    return u;
  }
}

type Props = {
  topHighlights: RankResult[];
};

export default function TopHighlights({ topHighlights }: Props) {
  // Filter out N/A and invalid positions
  const validResults = topHighlights.filter((r) => {
    const pos = typeof r.position === "number" ? r.position : Number(r.position);
    return !isNaN(pos) && pos > 0 && pos <= 100;
  });

  if (!validResults.length) return null;

  // Group by position ranges
  const top3 = validResults.filter(r => {
    const pos = typeof r.position === "number" ? r.position : Number(r.position);
    return pos >= 1 && pos <= 3;
  });

  const top4to6 = validResults.filter(r => {
    const pos = typeof r.position === "number" ? r.position : Number(r.position);
    return pos >= 4 && pos <= 6;
  });

  const top7to10 = validResults.filter(r => {
    const pos = typeof r.position === "number" ? r.position : Number(r.position);
    return pos >= 7 && pos <= 10;
  });

  const top11to100 = validResults.filter(r => {
    const pos = typeof r.position === "number" ? r.position : Number(r.position);
    return pos >= 11 && pos <= 100;
  });

  // Helper function to get colors based on position
  function getColors(position: number): { iconColor: string; badgeColor: string } {
    if (position >= 1 && position <= 3) {
      return { iconColor: "green", badgeColor: "green" };
    } else if (position >= 4 && position <= 6) {
      return { iconColor: "yellow", badgeColor: "yellow" };
    } else if (position >= 7 && position <= 10) {
      return { iconColor: "orange", badgeColor: "orange" };
    } else if (position >= 11 && position <= 100) {
      return { iconColor: "red", badgeColor: "red" };
    } else {
      return { iconColor: "gray", badgeColor: "gray" };
    }
  }

  function renderGroup(results: RankResult[], title: string, color: string) {
    if (results.length === 0) return null;

    return (
      <Stack gap="md" key={title}>
        <Group gap="xs">
          <Text size="sm" fw={600} c={color}>{title}</Text>
          <Badge variant="light" color={color} size="sm">{results.length}</Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {results.map((result, idx) => {
            const Icon = getRankIcon(Number(result.position));
            const colors = getColors(Number(result.position));
            return (
              <Card key={idx} withBorder shadow="sm" p="md">
                <Group justify="space-between" mb="sm">
                  <Box
                    style={{
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--mantine-radius-sm)',
                      backgroundColor: `var(--mantine-color-${colors.iconColor}-1)`,
                      color: `var(--mantine-color-${colors.iconColor}-6)`
                    }}
                  >
                    <Icon size={14} />
                  </Box>
                  <Badge variant="filled" color={colors.badgeColor} size="sm">
                    #{result.position}
                  </Badge>
                </Group>
                <Stack gap="xs">
                  <Text size="sm" fw={500} lineClamp={1}>{result.keyword}</Text>
                  <Code>{result.domain}</Code>
                  {result.url && (
                    <Anchor
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      size="xs"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Text size="xs" truncate>{hostFromUrl(result.url)}</Text>
                      <ExternalLink size={12} />
                    </Anchor>
                  )}
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      {renderGroup(top3, "Top 1-3", "green")}
      {renderGroup(top4to6, "Top 4-6", "yellow")}
      {renderGroup(top7to10, "Top 7-10", "orange")}
      {renderGroup(top11to100, "Top 11-100", "red")}
    </Stack>
  );
}
