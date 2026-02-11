import { useMemo } from "react";
import { Box, Group, Stack, Text, Tooltip } from "@mantine/core";
import { BarChart3 } from "lucide-react";
import type { RankResult } from "@hooks/useSSE";

type Props = {
  results: RankResult[];
};

export function PositionChart({ results }: Props) {
  const distribution = useMemo(() => {
    const ranges = {
      "1-3": 0,
      "4-6": 0,
      "7-10": 0,
      "11-100": 0,
      "N/A": 0,
    };

    results.forEach((r) => {
      const pos = typeof r.position === "number" ? r.position : Number(r.position);
      if (isNaN(pos) || pos <= 0) {
        ranges["N/A"]++;
        return;
      }

      if (pos >= 1 && pos <= 3) ranges["1-3"]++;
      else if (pos >= 4 && pos <= 6) ranges["4-6"]++;
      else if (pos >= 7 && pos <= 10) ranges["7-10"]++;
      else if (pos >= 11 && pos <= 100) ranges["11-100"]++;
      else ranges["N/A"]++;
    });

    return ranges;
  }, [results]);

  const maxCount = Math.max(...Object.values(distribution));
  const totalResults = results.length;

  const rangeColors = {
    "1-3": "var(--mantine-color-green-6)",
    "4-6": "var(--mantine-color-yellow-6)",
    "7-10": "var(--mantine-color-orange-6)",
    "11-100": "var(--mantine-color-red-6)",
    "N/A": "var(--mantine-color-gray-5)",
  };

  if (totalResults === 0) return null;

  return (
    <Stack gap="md">
      <Group gap="xs">
        <BarChart3 size={16} color="var(--mantine-color-dimmed)" />
        <Text fw={600} size="sm">Position Distribution</Text>
      </Group>

      <Stack gap="xs">
        {(Object.keys(distribution) as Array<keyof typeof distribution>).map((range) => {
          const count = distribution[range];
          const percentage = totalResults > 0 ? (count / totalResults) * 100 : 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <Box key={range}>
              <Group justify="space-between" mb={4}>
                <Text size="xs" fw={500} c="dimmed" style={{ minWidth: 60 }}>
                  Pos {range}
                </Text>
                <Group gap="xs">
                  <Text size="xs" fw={600}>
                    {count}
                  </Text>
                  <Text size="xs" c="dimmed">
                    ({percentage.toFixed(1)}%)
                  </Text>
                </Group>
              </Group>
              <Tooltip
                label={`${count} results in position ${range} (${percentage.toFixed(1)}%)`}
                position="top"
              >
                <Box
                  style={{
                    width: "100%",
                    height: 24,
                    backgroundColor: "var(--mantine-color-gray-1)",
                    borderRadius: 4,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Box
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      backgroundColor: rangeColors[range],
                      transition: "width 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: 8,
                    }}
                  >
                    {count > 0 && (
                      <Text size="xs" fw={600} c="white">
                        {count}
                      </Text>
                    )}
                  </Box>
                </Box>
              </Tooltip>
            </Box>
          );
        })}
      </Stack>

      {/* Legend */}
      <Group gap="xs" wrap="wrap">
        <Group gap={4}>
          <Box style={{ width: 12, height: 12, backgroundColor: rangeColors["1-3"], borderRadius: 2 }} />
          <Text size="xs" c="dimmed">Top 1-3</Text>
        </Group>
        <Group gap={4}>
          <Box style={{ width: 12, height: 12, backgroundColor: rangeColors["4-6"], borderRadius: 2 }} />
          <Text size="xs" c="dimmed">Top 4-6</Text>
        </Group>
        <Group gap={4}>
          <Box style={{ width: 12, height: 12, backgroundColor: rangeColors["7-10"], borderRadius: 2 }} />
          <Text size="xs" c="dimmed">Top 7-10</Text>
        </Group>
        <Group gap={4}>
          <Box style={{ width: 12, height: 12, backgroundColor: rangeColors["11-100"], borderRadius: 2 }} />
          <Text size="xs" c="dimmed">Top 11-100</Text>
        </Group>
        <Group gap={4}>
          <Box style={{ width: 12, height: 12, backgroundColor: rangeColors["N/A"], borderRadius: 2 }} />
          <Text size="xs" c="dimmed">N/A</Text>
        </Group>
      </Group>
    </Stack>
  );
}
