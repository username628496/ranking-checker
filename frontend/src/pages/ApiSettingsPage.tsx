import { useState, useEffect } from "react";
import { Key, Check, X, AlertCircle, Settings, Save, XCircle } from "lucide-react";
import { Card, Button, Stack, Group, Box, Text, Alert, Select, NumberInput, PasswordInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import PageHeader from "@components/PageHeader";
import Footer from "@components/Footer";
import axios from "axios";
import { API_ENDPOINTS } from "@/config/api";
import { getErrorMessage } from "@/utils/errorHandler";

export default function ApiSettingsPage() {
  // API Settings
  const [serperApiKey, setSerperApiKey] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<"idle" | "valid" | "invalid">("idle");

  // General Settings
  const [defaultLocation, setDefaultLocation] = useState("vn");
  const [defaultDevice, setDefaultDevice] = useState("desktop");
  const [requestTimeout, setRequestTimeout] = useState(15);
  const [maxWorkers, setMaxWorkers] = useState(6);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("serper_api_key");
    const savedLocation = localStorage.getItem("default_location");
    const savedDevice = localStorage.getItem("default_device");
    const savedTimeout = localStorage.getItem("request_timeout");
    const savedWorkers = localStorage.getItem("max_workers");

    if (savedApiKey) {
      setSerperApiKey(savedApiKey);
      setApiKeyStatus("valid");
    }
    if (savedLocation) setDefaultLocation(savedLocation);
    if (savedDevice) setDefaultDevice(savedDevice);
    if (savedTimeout) setRequestTimeout(Number(savedTimeout));
    if (savedWorkers) setMaxWorkers(Number(savedWorkers));
  }, []);

  const handleTestApiKey = async () => {
    if (!serperApiKey.trim()) {
      setApiKeyStatus("invalid");
      notifications.show({
        message: 'Please enter an API key',
        color: 'red',
        icon: <AlertCircle size={14} />,
        autoClose: 2000,
      });
      return;
    }

    // Show loading notification
    const loadingNotification = notifications.show({
      message: 'Testing API key...',
      color: 'blue',
      loading: true,
      autoClose: false,
    });

    try {
      // Call backend validation endpoint (more secure)
      const response = await axios.post(API_ENDPOINTS.VALIDATE_API_KEY, {
        api_key: serperApiKey,
      });

      notifications.hide(loadingNotification);

      if (response.data.valid) {
        setApiKeyStatus("valid");
        notifications.show({
          message: 'API key valid',
          color: 'green',
          icon: <Check size={14} />,
          autoClose: 2000,
        });
      } else {
        setApiKeyStatus("invalid");
        notifications.show({
          message: 'Invalid API key',
          color: 'red',
          icon: <XCircle size={14} />,
          autoClose: 2000,
        });
      }
    } catch (err) {
      notifications.hide(loadingNotification);
      setApiKeyStatus("invalid");

      const errorMessage = getErrorMessage(
        err,
        'Failed to test API key. Please check your network connection.'
      );

      notifications.show({
        message: errorMessage,
        color: 'red',
        icon: <AlertCircle size={14} />,
        autoClose: 2000,
      });
    }
  };

  const handleSaveSettings = () => {
    // Save to localStorage
    if (serperApiKey) {
      localStorage.setItem("serper_api_key", serperApiKey);
    } else {
      localStorage.removeItem("serper_api_key");
    }

    localStorage.setItem("default_location", defaultLocation);
    localStorage.setItem("default_device", defaultDevice);
    localStorage.setItem("request_timeout", requestTimeout.toString());
    localStorage.setItem("max_workers", maxWorkers.toString());

    notifications.show({
      message: 'Settings saved',
      color: 'green',
      icon: <Check size={14} />,
      autoClose: 2000,
    });
  };

  const handleClearApiKey = () => {
    setSerperApiKey("");
    setApiKeyStatus("idle");
    localStorage.removeItem("serper_api_key");
    notifications.show({
      message: 'API Key cleared',
      color: 'blue',
      icon: <Check size={14} />,
      autoClose: 2000,
    });
  };

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box style={{ flex: 1, overflow: 'auto' }} p="md">
        <Stack gap="md" maw={1200} mx="auto">
          <PageHeader
            icon={<Settings size={28} />}
            title="API Settings"
            description="Configure your Serper API key and application settings"
            color="#10b981"
          />

        {/* API Settings Section */}
        <Card withBorder shadow="sm" p="md">
          <Group gap="xs" mb="md">
            <Key size={16} color="var(--mantine-color-dimmed)" />
            <Text fw={600} size="sm">API Configuration</Text>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Configure your Serper.dev API key for custom rate limits
          </Text>
          <Stack gap="md">
            {/* Serper API Key */}
            <PasswordInput
              label="Serper.dev API Key"
              value={serperApiKey}
              onChange={(e) => {
                setSerperApiKey(e.target.value);
                setApiKeyStatus("idle");
              }}
              placeholder="Enter your API key from serper.dev"
              rightSection={
                apiKeyStatus !== "idle" ? (
                  apiKeyStatus === "valid" ? (
                    <Check size={18} color="var(--mantine-color-green-6)" />
                  ) : (
                    <X size={18} color="var(--mantine-color-red-6)" />
                  )
                ) : undefined
              }
              styles={{ input: { fontFamily: 'monospace' } }}
            />

            <Group gap="xs">
              <Button
                onClick={handleTestApiKey}
                disabled={!serperApiKey.trim()}
                size="sm"
              >
                Test API Key
              </Button>
              <Button
                onClick={handleClearApiKey}
                disabled={!serperApiKey.trim()}
                variant="outline"
                color="red"
                size="sm"
              >
                Clear API Key
              </Button>
            </Group>

            <Alert variant="light" color="blue" icon={<AlertCircle size={16} />}>
              <Stack gap={4}>
                <Text size="xs">Get a free API key at: <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-blue-6)', textDecoration: 'underline' }}>serper.dev</a></Text>
                <Text size="xs">API key is stored locally in your browser (localStorage), not sent to server</Text>
              </Stack>
            </Alert>
          </Stack>
        </Card>

        {/* General Settings Section */}
        <Card withBorder shadow="sm" p="md">
          <Group gap="xs" mb="md">
            <Settings size={16} color="var(--mantine-color-dimmed)" />
            <Text fw={600} size="sm">General Settings</Text>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Configure default options for keyword checks
          </Text>
          <Stack gap="md">
            {/* Default Location */}
            <Select
              label="Default Location"
              value={defaultLocation}
              onChange={(value) => setDefaultLocation(value || "vn")}
              data={[
                { value: "vn", label: "Nationwide (Vietnam)" },
                { value: "hanoi", label: "Hanoi" },
                { value: "hochiminh", label: "Ho Chi Minh City" },
                { value: "danang", label: "Da Nang" },
              ]}
            />

            {/* Default Device */}
            <Select
              label="Default Device"
              value={defaultDevice}
              onChange={(value) => setDefaultDevice(value || "desktop")}
              data={[
                { value: "desktop", label: "Desktop" },
                { value: "mobile", label: "Mobile" },
              ]}
            />

            {/* Request Timeout */}
            <NumberInput
              label="Request Timeout (seconds)"
              value={requestTimeout}
              onChange={(value) => setRequestTimeout(Number(value))}
              min={5}
              max={60}
            />

            {/* Max Workers */}
            <Box>
              <NumberInput
                label="Concurrent Workers"
                value={maxWorkers}
                onChange={(value) => setMaxWorkers(Number(value))}
                min={1}
                max={20}
              />
              <Text size="xs" c="dimmed" mt={4}>
                Increasing workers may exceed API rate limits
              </Text>
            </Box>

            {/* Save Button */}
            <Button
              onClick={handleSaveSettings}
              fullWidth
              leftSection={<Save size={16} />}
            >
              Save Settings
            </Button>
          </Stack>
        </Card>

        {/* Info Box */}
        <Alert variant="light" color="blue" icon={<AlertCircle size={16} />}>
          <Stack gap="xs">
            <Text size="sm" fw={500}>About API Keys:</Text>
            <Stack gap={4}>
              <Text size="xs">• Without a custom API key, the system uses the default server key</Text>
              <Text size="xs">• Custom API keys help avoid shared rate limits</Text>
              <Text size="xs">• Serper.dev provides 2,500 free searches per month</Text>
            </Stack>
          </Stack>
        </Alert>
        </Stack>
      </Box>

      <Footer />
    </Box>
  );
}
