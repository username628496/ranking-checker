import { useState } from "react";
import { TrendingUp, Settings, ClipboardList, Menu, X, Home } from "lucide-react";
import { AppShell, Box, ActionIcon, Tabs, Drawer, Stack, NavLink, Text } from "@mantine/core";
import { ErrorBoundary } from "@components/ErrorBoundary";
import SingleCheckPage from "./pages/SingleCheckPage";
import BulkCheckPage from "./pages/BulkCheckPage";
import ApiSettingsPage from "./pages/ApiSettingsPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("single");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const navItems = [
    { value: "single", label: "Home", icon: Home },
    { value: "bulk", label: "30 Ranking", icon: TrendingUp },
    { value: "settings", label: "Settings", icon: Settings },
    { value: "history", label: "History", icon: ClipboardList },
  ];

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      setMobileMenuOpen(false);

      // Force refresh History when switching to it
      if (value === "history") {
        setHistoryRefreshKey(prev => prev + 1);
      }
    }
  };

  return (
    <AppShell
      header={{ height: { base: 60, sm: 70 } }}
      padding={0}
      styles={{
        main: {
          paddingTop: 'var(--app-shell-header-height)',
          height: '100vh',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <AppShell.Header style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Box h="100%" px={{ base: 'sm', sm: 'md', lg: 'xl' }} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Desktop Navigation - Center */}
          <Box visibleFrom="md">
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="pills"
              radius="md"
            >
              <Tabs.List>
                {navItems.map((item) => (
                  <Tabs.Tab
                    key={item.value}
                    value={item.value}
                    leftSection={<item.icon size={16} strokeWidth={2} />}
                  >
                    {item.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          </Box>

          {/* Mobile Menu Button - Right */}
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            hiddenFrom="md"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ position: 'absolute', right: 0, flexShrink: 0 }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </ActionIcon>
        </Box>
      </AppShell.Header>

      {/* Mobile Navigation Drawer */}
      <Drawer
        opened={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        size="xs"
        position="right"
        title={
          <Text fw={700} c="blue">
            Navigation
          </Text>
        }
        styles={{
          title: { width: '100%' },
        }}
      >
        <Stack gap="xs">
          {navItems.map((item) => (
            <NavLink
              key={item.value}
              label={item.label}
              leftSection={<item.icon size={18} />}
              active={activeTab === item.value}
              onClick={() => handleTabChange(item.value)}
              styles={{
                root: {
                  borderRadius: 'var(--mantine-radius-md)',
                  padding: '0.75rem 1rem',
                },
                label: {
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                },
              }}
            />
          ))}
        </Stack>
      </Drawer>

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
              <HistoryPage key={historyRefreshKey} />
            </ErrorBoundary>
          )}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
