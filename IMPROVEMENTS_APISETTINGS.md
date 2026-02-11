# UI/UX IMPROVEMENTS - API SETTINGS PAGE
**File:** `frontend/src/pages/ApiSettingsPage.tsx`

---

## CURRENT STATE ANALYSIS

### Layout Structure
```
Header
└─ API Configuration Card
   ├─ Serper API Key input (password)
   ├─ Test API Key button + Clear button
   ├─ Security warning alert
   └─ Status icon (check/X)
└─ General Settings Card
   ├─ Default Location (select)
   ├─ Default Device (select)
   ├─ Request Timeout (number input)
   ├─ Max Workers (number input)
   └─ Save Settings button
└─ Info Alert (about API keys)
```

### Current Issues
1. Settings saved to localStorage but NOT APPLIED to forms
2. No API usage dashboard (blind to credit consumption)
3. API key stored in plain text (security risk)
4. No settings export/import
5. No validation warnings

---

## 🔴 CRITICAL IMPROVEMENTS (P0)

### 1. Integrate Settings with Form Components

**Problem:** Settings are saved but never used - completely non-functional

**Current Flow:**
```
User changes settings → Saves to localStorage → Nothing happens
Form components use their own localStorage keys → Ignore settings
```

**Solution:** Create centralized Settings Context

```typescript
// Create: frontend/src/contexts/SettingsContext.tsx

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AppSettings {
  // API Configuration
  serperApiKey: string;
  apiKeyStatus: 'idle' | 'valid' | 'invalid';

  // Default Values
  defaultLocation: string;
  defaultDevice: 'desktop' | 'mobile';
  requestTimeout: number;
  maxWorkers: number;

  // UI Preferences
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showTips: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  serperApiKey: '',
  apiKeyStatus: 'idle',
  defaultLocation: 'vn',
  defaultDevice: 'desktop',
  requestTimeout: 15,
  maxWorkers: 6,
  theme: 'auto',
  compactMode: false,
  showTips: true,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem('app_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    return DEFAULT_SETTINGS;
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('app_settings');
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
```

**Wrap App with SettingsProvider:**
```typescript
// frontend/src/main.tsx

import { SettingsProvider } from '@/contexts/SettingsContext';

createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme}>
    <Notifications position="top-right" />
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </MantineProvider>
);
```

**Update ApiSettingsPage to use context:**
```typescript
import { useSettings } from '@/contexts/SettingsContext';

export default function ApiSettingsPage() {
  const { settings, updateSettings } = useSettings();

  // Remove local state, use context instead
  const handleSaveSettings = () => {
    updateSettings({
      serperApiKey,
      defaultLocation,
      defaultDevice,
      requestTimeout,
      maxWorkers,
    });

    notifications.show({
      title: 'Settings Saved',
      message: 'Your settings have been updated',
      color: 'green',
      icon: <Check size={16} />,
    });
  };

  // ... rest of component
}
```

**Update Form components to use settings:**
```typescript
// frontend/src/components/Form.tsx

import { useSettings } from '@/contexts/SettingsContext';

export default function Form({ onStart, onError }: FormProps) {
  const { settings } = useSettings();

  // Initialize with default settings
  const [location, setLocation] = useState(settings.defaultLocation);
  const [device, setDevice] = useState<"desktop" | "mobile">(settings.defaultDevice);

  // ... rest of component
}
```

**Estimated Effort:** 6-8 hours

---

### 2. Add API Usage Dashboard (Same as HistoryPage)

**Problem:** Users have NO IDEA how many credits they're using

**Implementation:** Move usage stats to Settings page as well

```typescript
// Add to ApiSettingsPage
const [usageStats, setUsageStats] = useState<any>(null);

useEffect(() => {
  loadUsageStats();
}, []);

async function loadUsageStats() {
  try {
    const response = await axios.get(API_ENDPOINTS.HISTORY_USAGE_STATS);
    setUsageStats(response.data);
  } catch (err) {
    console.error('Failed to load usage stats:', err);
  }
}

// Add dashboard card
{usageStats && (
  <Card withBorder shadow="sm" p="md" mb="md">
    <Group justify="space-between" mb="md">
      <Group gap="xs">
        <Activity size={16} color="var(--mantine-color-dimmed)" />
        <Text fw={600} size="sm">API Usage Overview</Text>
      </Group>
      <Anchor href="#" onClick={() => setActiveTab('history')} size="xs">
        View Full History →
      </Anchor>
    </Group>

    {/* Mini stats grid */}
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
      <Card withBorder p="sm">
        <Text size="xs" c="dimmed">Today</Text>
        <Text size="xl" fw={700}>{usageStats.todayCredits}</Text>
      </Card>
      <Card withBorder p="sm">
        <Text size="xs" c="dimmed">This Month</Text>
        <Text size="xl" fw={700}>{usageStats.monthCredits}</Text>
      </Card>
      <Card withBorder p="sm">
        <Text size="xs" c="dimmed">Avg/Day</Text>
        <Text size="xl" fw={700}>{Math.round(usageStats.avgPerDay)}</Text>
      </Card>
      <Card withBorder p="sm">
        <Text size="xs" c="dimmed">Total Checks</Text>
        <Text size="xl" fw={700}>{usageStats.totalChecks}</Text>
      </Card>
    </SimpleGrid>

    {/* Mini chart */}
    <AreaChart
      h={150}
      data={usageStats.last30Days.slice(-7)} // Last 7 days
      dataKey="date"
      series={[{ name: 'credits', color: 'blue.6' }]}
      curveType="monotone"
    />
  </Card>
)}
```

**Estimated Effort:** 3-4 hours

---

### 3. Improve API Key Security

**Problem:** API key stored in localStorage (plain text, visible in DevTools)

**Proposed Solutions:**

**Option A: Backend Proxy (Recommended)**
```typescript
// Remove API key from frontend entirely
// Backend uses environment variable

// Frontend just triggers checks without sending key
await axios.post('/api/check', { keyword, domain });

// Backend uses SERPER_API_KEY from environment
```

**Option B: Encrypt in localStorage (Partial solution)**
```typescript
// Use simple encryption (still not perfect but better than plain text)
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'ranking-checker-secret-key'; // Store this securely

function encryptApiKey(key: string): string {
  return CryptoJS.AES.encrypt(key, ENCRYPTION_KEY).toString();
}

function decryptApiKey(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// When saving
localStorage.setItem('serper_api_key', encryptApiKey(apiKey));

// When loading
const encrypted = localStorage.getItem('serper_api_key');
if (encrypted) {
  const decrypted = decryptApiKey(encrypted);
  setSerperApiKey(decrypted);
}
```

**Recommendation:** Use Option A (Backend Proxy) for production

**Estimated Effort:** 4-5 hours

---

## 🟡 HIGH PRIORITY IMPROVEMENTS (P1)

### 4. Add Settings Export/Import

**Feature:** Backup and restore settings

```typescript
function exportSettings() {
  const settingsJson = JSON.stringify(settings, null, 2);
  const blob = new Blob([settingsJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ranking-checker-settings-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  notifications.show({
    title: 'Settings Exported',
    message: 'Settings file downloaded',
    color: 'green',
    icon: <Download size={16} />,
  });
}

function importSettings(file: File) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target?.result as string);

      // Validate structure
      if (typeof imported !== 'object') {
        throw new Error('Invalid settings file');
      }

      // Confirm before overwriting
      if (window.confirm('This will overwrite your current settings. Continue?')) {
        updateSettings(imported);

        notifications.show({
          title: 'Settings Imported',
          message: 'Settings have been restored',
          color: 'green',
          icon: <Upload size={16} />,
        });
      }
    } catch (err) {
      notifications.show({
        title: 'Import Failed',
        message: 'Invalid settings file format',
        color: 'red',
        icon: <X size={16} />,
      });
    }
  };

  reader.readAsText(file);
}

// Add buttons
<Card withBorder shadow="sm" p="md">
  <Group gap="xs" mb="md">
    <Settings size={16} color="var(--mantine-color-dimmed)" />
    <Text fw={600} size="sm">Settings Management</Text>
  </Group>

  <Stack gap="md">
    <Group gap="xs">
      <Button
        variant="light"
        leftSection={<Download size={16} />}
        onClick={exportSettings}
      >
        Export Settings
      </Button>

      <FileButton onChange={importSettings} accept="application/json">
        {(props) => (
          <Button
            {...props}
            variant="light"
            leftSection={<Upload size={16} />}
          >
            Import Settings
          </Button>
        )}
      </FileButton>

      <Button
        variant="light"
        color="red"
        leftSection={<RotateCcw size={16} />}
        onClick={() => {
          if (window.confirm('Reset all settings to defaults?')) {
            resetSettings();
            notifications.show({
              title: 'Settings Reset',
              message: 'All settings restored to defaults',
              color: 'orange',
            });
          }
        }}
      >
        Reset to Defaults
      </Button>
    </Group>

    <Text size="xs" c="dimmed">
      Export your settings to backup or transfer to another device
    </Text>
  </Stack>
</Card>
```

**Estimated Effort:** 3-4 hours

---

### 5. Add Settings Validation & Warnings

**Feature:** Warn about problematic settings

```typescript
// Validation warnings
const warnings = useMemo(() => {
  const warns: string[] = [];

  if (requestTimeout < 10) {
    warns.push('Request timeout is very low. This may cause failed checks.');
  }

  if (maxWorkers > 10) {
    warns.push('High worker count may trigger rate limiting. Consider reducing to 6-8.');
  }

  if (requestTimeout > 60) {
    warns.push('Very high timeout may slow down checks significantly.');
  }

  if (!serperApiKey) {
    warns.push('No API key configured. Checks will fail.');
  }

  return warns;
}, [requestTimeout, maxWorkers, serperApiKey]);

// Show warnings
{warnings.length > 0 && (
  <Alert icon={<AlertTriangle size={16} />} color="yellow" title="Configuration Warnings">
    <Stack gap="xs">
      {warnings.map((warning, idx) => (
        <Text key={idx} size="sm">• {warning}</Text>
      ))}
    </Stack>
  </Alert>
)}

// Add validation to inputs
<NumberInput
  label="Request Timeout (seconds)"
  value={requestTimeout}
  onChange={(value) => {
    setRequestTimeout(Number(value) || 15);

    if (Number(value) < 5) {
      notifications.show({
        title: 'Warning',
        message: 'Timeout too low, minimum recommended is 10 seconds',
        color: 'yellow',
      });
    }
  }}
  min={5}
  max={120}
  error={requestTimeout < 10 ? 'Timeout is very low' : undefined}
/>

<NumberInput
  label="Max Workers"
  value={maxWorkers}
  onChange={(value) => {
    setMaxWorkers(Number(value) || 6);

    if (Number(value) > 10) {
      notifications.show({
        title: 'Warning',
        message: 'High worker count may cause rate limiting',
        color: 'yellow',
      });
    }
  }}
  min={1}
  max={20}
  error={maxWorkers > 10 ? 'May trigger rate limiting' : undefined}
/>
```

**Estimated Effort:** 2-3 hours

---

### 6. Add API Key Features

**Features:**
- Show API key validity status
- Auto-test on page load
- Show last tested timestamp
- Key strength indicator

```typescript
const [lastTested, setLastTested] = useState<Date | null>(null);

// Auto-test on mount if key exists
useEffect(() => {
  if (serperApiKey && apiKeyStatus === 'idle') {
    handleTestApiKey();
  }
}, []);

// Show last tested
{lastTested && (
  <Text size="xs" c="dimmed">
    Last tested: {formatRelativeTime(lastTested)}
  </Text>
)}

// API Key strength indicator
function getKeyStrength(key: string): { level: string; color: string; message: string } {
  if (key.length === 0) {
    return { level: 'none', color: 'gray', message: 'No key provided' };
  }
  if (key.length < 20) {
    return { level: 'weak', color: 'red', message: 'Key seems too short' };
  }
  if (!/^[a-zA-Z0-9]+$/.test(key)) {
    return { level: 'invalid', color: 'red', message: 'Invalid characters in key' };
  }
  return { level: 'valid', color: 'green', message: 'Key format looks good' };
}

const keyStrength = useMemo(() => getKeyStrength(serperApiKey), [serperApiKey]);

// Show strength indicator
<Group gap="xs" mt="xs">
  <Badge color={keyStrength.color} variant="dot">
    {keyStrength.level}
  </Badge>
  <Text size="xs" c="dimmed">{keyStrength.message}</Text>
</Group>

// Add copy button
<ActionIcon
  variant="subtle"
  onClick={() => {
    navigator.clipboard.writeText(serperApiKey);
    notifications.show({
      message: 'API key copied to clipboard',
      color: 'blue',
      icon: <Copy size={16} />,
    });
  }}
  disabled={!serperApiKey}
>
  <Copy size={16} />
</ActionIcon>
```

**Estimated Effort:** 3-4 hours

---

## 🟢 MEDIUM PRIORITY (P2)

### 7. Add Theme Customization

**Feature:** Dark mode and theme preferences

```typescript
import { useMantineColorScheme } from '@mantine/core';

const { colorScheme, toggleColorScheme } = useMantineColorScheme();

<Card withBorder shadow="sm" p="md">
  <Group gap="xs" mb="md">
    <Palette size={16} color="var(--mantine-color-dimmed)" />
    <Text fw={600} size="sm">Appearance</Text>
  </Group>

  <Stack gap="md">
    <SegmentedControl
      value={colorScheme}
      onChange={toggleColorScheme}
      data={[
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'Auto', value: 'auto' },
      ]}
    />

    <Switch
      label="Compact Mode"
      description="Reduce spacing for more content"
      checked={settings.compactMode}
      onChange={(e) => updateSettings({ compactMode: e.target.checked })}
    />

    <Switch
      label="Show Tips"
      description="Display helpful tips throughout the app"
      checked={settings.showTips}
      onChange={(e) => updateSettings({ showTips: e.target.checked })}
    />
  </Stack>
</Card>
```

**Estimated Effort:** 4-5 hours

---

### 8. Add Keyboard Shortcuts Settings

**Feature:** Customize keyboard shortcuts

```typescript
<Card withBorder shadow="sm" p="md">
  <Group gap="xs" mb="md">
    <Keyboard size={16} color="var(--mantine-color-dimmed)" />
    <Text fw={600} size="sm">Keyboard Shortcuts</Text>
  </Group>

  <Stack gap="sm">
    <Group justify="space-between">
      <Text size="sm">Open Command Palette</Text>
      <Kbd>Cmd + K</Kbd>
    </Group>

    <Group justify="space-between">
      <Text size="sm">Submit Form</Text>
      <Kbd>Cmd + Enter</Kbd>
    </Group>

    <Group justify="space-between">
      <Text size="sm">Go to Home</Text>
      <Kbd>Cmd + 1</Kbd>
    </Group>

    <Group justify="space-between">
      <Text size="sm">Go to 30 Ranking</Text>
      <Kbd>Cmd + 2</Kbd>
    </Group>

    <Divider />

    <Button
      variant="light"
      size="xs"
      leftSection={<HelpCircle size={14} />}
      onClick={() => {
        // Open shortcuts help modal
      }}
    >
      View All Shortcuts
    </Button>
  </Stack>
</Card>
```

**Estimated Effort:** 3-4 hours

---

## 🔵 QUICK WINS

### 9. Add Visual Feedback on Save

```typescript
const [saving, setSaving] = useState(false);
const [saved, setSaved] = useState(false);

const handleSaveSettings = async () => {
  setSaving(true);

  // Simulate save delay
  await new Promise(resolve => setTimeout(resolve, 500));

  updateSettings({
    defaultLocation,
    defaultDevice,
    requestTimeout,
    maxWorkers,
  });

  setSaving(false);
  setSaved(true);

  notifications.show({
    title: 'Settings Saved',
    message: 'Your settings have been updated',
    color: 'green',
    icon: <Check size={16} />,
  });

  // Reset saved state after 2s
  setTimeout(() => setSaved(false), 2000);
};

// Update button
<Button
  onClick={handleSaveSettings}
  leftSection={
    saving ? <Loader size={16} /> :
    saved ? <Check size={16} /> :
    <Save size={16} />
  }
  color={saved ? 'green' : 'blue'}
  loading={saving}
>
  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
</Button>
```

**Estimated Effort:** 1-2 hours

---

### 10. Add "About" Section

```typescript
<Card withBorder shadow="sm" p="md">
  <Group gap="xs" mb="md">
    <Info size={16} color="var(--mantine-color-dimmed)" />
    <Text fw={600} size="sm">About</Text>
  </Group>

  <Stack gap="sm">
    <Group justify="space-between">
      <Text size="sm">Version</Text>
      <Badge variant="light">1.0.0</Badge>
    </Group>

    <Group justify="space-between">
      <Text size="sm">Last Updated</Text>
      <Text size="sm" c="dimmed">February 9, 2026</Text>
    </Group>

    <Divider />

    <Group gap="xs">
      <Anchor href="https://github.com/..." target="_blank" size="xs">
        <Group gap={4}>
          <Github size={14} />
          <Text>GitHub</Text>
        </Group>
      </Anchor>

      <Anchor href="#" size="xs">
        <Group gap={4}>
          <HelpCircle size={14} />
          <Text>Documentation</Text>
        </Group>
      </Anchor>

      <Anchor href="#" size="xs">
        <Group gap={4}>
          <Mail size={14} />
          <Text>Support</Text>
        </Group>
      </Anchor>
    </Group>
  </Stack>
</Card>
```

**Estimated Effort:** 1-2 hours

---

## ESTIMATED TOTAL EFFORT

| Priority | Tasks | Hours |
|----------|-------|-------|
| P0 Critical | 3 tasks | 13-17h |
| P1 High | 3 tasks | 8-11h |
| P2 Medium | 2 tasks | 7-9h |
| Quick Wins | 2 tasks | 2-4h |
| **TOTAL** | **10 tasks** | **30-41h** |

---

## IMPLEMENTATION ORDER

1. ✅ **Settings Context Integration** (6-8h) - CRITICAL
2. ✅ **API Usage Dashboard** (3-4h) - High value
3. ✅ **Settings Validation** (2-3h) - Prevent errors
4. ✅ **Export/Import Settings** (3-4h) - User convenience
5. **API Key Improvements** (3-4h) - Better UX
6. **Visual Save Feedback** (1-2h) - Quick win
7. **About Section** (1-2h) - Quick win
8. **Theme Customization** (4-5h) - Nice to have
9. **Keyboard Shortcuts** (3-4h) - Power users
10. **API Key Security** (4-5h) - Production ready

---

## DEPENDENCIES

**MUST DO FIRST:**
- Settings Context Integration - All other pages depend on this

**CAN DO INDEPENDENTLY:**
- API Usage Dashboard
- Settings Validation
- Export/Import
- Visual feedback
- About section

**DO LAST:**
- Theme Customization (requires app-wide changes)
- API Key Security (requires backend changes)

---

## NEXT STEPS

1. Implement Settings Context first (everything depends on this)
2. Update Form components to use context
3. Test settings propagation
4. Add API usage dashboard
5. Implement validation and warnings
6. Polish with Quick Wins

---

**Document Version:** 1.0
**Last Updated:** February 9, 2026
