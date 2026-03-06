import { Box, Text, Group } from "@mantine/core";

export default function Footer() {
  return (
    <Box
      component="footer"
      mt="auto"
      py="xl"
      style={{
        borderTop: "1px solid var(--mantine-color-gray-3)",
        background: "var(--mantine-color-gray-0)",
      }}
    >
      <Group justify="center" gap="xs">
        <Text size="sm" c="dimmed">
          Hello World
        </Text>
        <Text size="sm" c="dimmed">|</Text>
        <Text size="sm" c="dimmed" fw={500}>
          @matthew161123
        </Text>
      </Group>
    </Box>
  );
}
