import { useState } from "react";
import { Home, TrendingUp, Settings, ClipboardList } from "lucide-react";
import { AppShell, Burger, NavLink, Stack, Group, Box, Tooltip } from "@mantine/core";
import { ErrorBoundary } from "@components/ErrorBoundary";
import SingleCheckPage from "./pages/SingleCheckPage";
import BulkCheckPage from "./pages/BulkCheckPage";
import ApiSettingsPage from "./pages/ApiSettingsPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("single");

  return (
    <AppShell
      header={{ height: 0 }}
      navbar={{
        width: 64,
        breakpoint: 'md',
        collapsed: { mobile: !mobileMenuOpen },
      }}
      padding={0}
      styles={{
        main: {
          height: '100vh',
          overflow: 'hidden',
        },
      }}
    >
      <AppShell.Navbar p={0} withBorder>
        {/* Logo/Title */}
        <AppShell.Section p="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
          <Group justify="center">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: '0.5rem',
                backgroundColor: 'var(--mantine-color-blue-6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Home size={16} color="white" />
            </Box>
          </Group>
        </AppShell.Section>

        {/* Navigation */}
        <AppShell.Section grow mt="xs" p="xs">
          <Stack gap={4}>
            <Tooltip label="Home" position="right">
              <NavLink
                leftSection={<Home size={18} />}
                active={activeTab === "single"}
                onClick={() => {
                  setActiveTab("single");
                  setMobileMenuOpen(false);
                }}
                styles={{
                  root: {
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem',
                  },
                  label: {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  },
                }}
              />
            </Tooltip>

            <Tooltip label="30 Ranking" position="right">
              <NavLink
                leftSection={<TrendingUp size={18} />}
                active={activeTab === "bulk"}
                onClick={() => {
                  setActiveTab("bulk");
                  setMobileMenuOpen(false);
                }}
                styles={{
                  root: {
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem',
                  },
                  label: {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  },
                }}
              />
            </Tooltip>

            <Tooltip label="Settings" position="right">
              <NavLink
                leftSection={<Settings size={18} />}
                active={activeTab === "settings"}
                onClick={() => {
                  setActiveTab("settings");
                  setMobileMenuOpen(false);
                }}
                styles={{
                  root: {
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem',
                  },
                  label: {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  },
                }}
              />
            </Tooltip>

            <Tooltip label="History" position="right">
              <NavLink
                leftSection={<ClipboardList size={18} />}
                active={activeTab === "history"}
                onClick={() => {
                  setActiveTab("history");
                  setMobileMenuOpen(false);
                }}
                styles={{
                  root: {
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem',
                  },
                  label: {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  },
                }}
              />
            </Tooltip>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Mobile Menu Button */}
      <Burger
        opened={mobileMenuOpen}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        hiddenFrom="md"
        size="sm"
        style={{
          position: 'fixed',
          left: 16,
          top: 16,
          zIndex: 100,
        }}
      />

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <Box
          onClick={() => setMobileMenuOpen(false)}
          hiddenFrom="md"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Main Content Area */}
      <AppShell.Main style={{ height: '100vh', overflow: 'hidden' }}>
        <Box style={{ height: '100%', overflow: 'auto' }}>
          {activeTab === "single" && (
            <ErrorBoundary fallbackTitle="Home Page Error">
              <SingleCheckPage />
            </ErrorBoundary>
          )}
          {activeTab === "bulk" && (
            <ErrorBoundary fallbackTitle="30 Ranking Page Error">
              <BulkCheckPage />
            </ErrorBoundary>
          )}
          {activeTab === "settings" && (
            <ErrorBoundary fallbackTitle="Settings Page Error">
              <ApiSettingsPage />
            </ErrorBoundary>
          )}
          {activeTab === "history" && (
            <ErrorBoundary fallbackTitle="History Page Error">
              <HistoryPage />
            </ErrorBoundary>
          )}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
