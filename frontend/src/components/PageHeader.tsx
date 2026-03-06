import { ReactNode } from "react";
import { Box, Text, Group, Stack } from "@mantine/core";

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
  color?: string;
}

export default function PageHeader({
  icon,
  title,
  description,
  actions,
  color = "#000000"
}: PageHeaderProps) {
  return (
    <Box
      style={{
        background: color,
        borderRadius: "var(--mantine-radius-md)",
        padding: "1rem 1.25rem",
        marginBottom: "1.5rem",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Group gap="md" align="center">
          <Box
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "var(--mantine-radius-sm)",
              color: "white",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Stack gap={2}>
            <Text size="lg" fw={600} c="white">
              {title}
            </Text>
            <Text size="sm" c="rgba(255, 255, 255, 0.9)">
              {description}
            </Text>
          </Stack>
        </Group>
        {actions && (
          <Box>
            {actions}
          </Box>
        )}
      </Group>
    </Box>
  );
}
