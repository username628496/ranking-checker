import { Loader2, CheckCircle } from "lucide-react";
import { Progress, Group, Text, Stack } from "@mantine/core";

type Props = {
  done: number;
  total: number;
  current?: { keyword?: string; domain?: string } | null;
  statusText?: string;
  ended?: boolean;
};

export default function ProgressBar({ done, total, current, statusText, ended }: Props) {
  if (!total) return null;
  const pct = Math.min(100, Math.round((done / total) * 100));

  return (
    <Stack gap="md">
      {/* Progress Bar */}
      <Progress value={pct} size="sm" radius="xl" animated={!ended} />

      {/* Info Row */}
      <Group justify="space-between" gap="md">
        {/* Left: Status */}
        <Group gap="xs">
          {!ended ? (
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--mantine-color-dimmed)' }} />
          ) : (
            <CheckCircle size={16} color="var(--mantine-color-green-6)" />
          )}
          <Text size="sm" fw={500}>
            {statusText || (ended ? "Completed" : "Processing")}
          </Text>
        </Group>

        {/* Right: Progress Stats */}
        <Group gap="md">
          {!ended && current?.keyword && (
            <Text size="sm" c="dimmed">
              <Text component="span" fw={500}>"{current.keyword}"</Text>
              {current.domain && (
                <>
                  {" • "}
                  <Text component="code" size="xs">{current.domain}</Text>
                </>
              )}
            </Text>
          )}
          <Text size="sm" fw={500} c="dimmed">
            {done}/{total} ({pct}%)
          </Text>
        </Group>
      </Group>
    </Stack>
  );
}
