import { useMemo, useRef, useState, useEffect } from "react";
import {
  Monitor,
  Smartphone,
  Globe,
  Type,
  Play,
  AlertCircle,
  Check,
} from "lucide-react";
import { Button, Textarea, Group, Stack, Text, Alert, Box, Tooltip } from "@mantine/core";
import { useLocalStorage } from "@hooks/useLocalStorage";
import { API_ENDPOINTS } from "@/config/api";

type Props = {
  onStart: (p: {
    sessionId: string;
    total: number;
    keywords: string[];
    domains: string[];
  }) => void;
  onError: (msg: string) => void;
  initialKeywords?: string;
  initialDomains?: string;
  isStreaming?: boolean;
};

const deviceOptions = [
  { value: "desktop", label: "Desktop", icon: Monitor },
  { value: "mobile", label: "Mobile", icon: Smartphone },
] as const;

const locationOptions = [
  { value: "vn", label: "Việt Nam", shortLabel: "VN" },
  { value: "hanoi", label: "Hà Nội", shortLabel: "HN" },
  { value: "hochiminh", label: "Hồ Chí Minh", shortLabel: "HCM" },
  { value: "danang", label: "Đà Nẵng", shortLabel: "DN" },
] as const;

const FORM_STORAGE_KEY = "form_inputs";

function normalizeDomain(d: string): string {
  try {
    return new URL(d).hostname.replace(/^www\./, "");
  } catch {
    return d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
}

function validateKeywords(keywords: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (keywords.length === 0) issues.push("Chưa có từ khóa");
  return { valid: issues.length === 0, issues };
}

function validateDomains(domains: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (domains.length === 0) issues.push("Chưa có domain");
  return { valid: issues.length === 0, issues };
}

function validatePairs(keywords: string[], domains: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (keywords.length !== domains.length) {
    issues.push(
      `Số lượng không khớp: ${keywords.length} từ khóa & ${domains.length} domain`
    );
  }
  return { valid: issues.length === 0, issues };
}

export default function Form({ onStart, onError, initialKeywords, initialDomains, isStreaming = false }: Props) {
  const formRef = useRef<HTMLDivElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Persist form inputs to localStorage
  const [keywordsText, setKeywordsText] = useLocalStorage(FORM_STORAGE_KEY + "_keywords", initialKeywords || "");
  const [domainsText, setDomainsText] = useLocalStorage(FORM_STORAGE_KEY + "_domains", initialDomains || "");
  const [device, setDevice] = useLocalStorage<"desktop" | "mobile">(FORM_STORAGE_KEY + "_device", "desktop");
  const [location, setLocation] = useLocalStorage(FORM_STORAGE_KEY + "_location", "vn");

  // Update text when template data changes
  useEffect(() => {
    if (initialKeywords !== undefined && initialKeywords !== null) {
      setKeywordsText(initialKeywords);
    }
    if (initialDomains !== undefined && initialDomains !== null) {
      setDomainsText(initialDomains);
    }
  }, [initialKeywords, initialDomains]);

  const keywords = useMemo(
    () => keywordsText.split("\n").map((s) => s.trim()).filter(Boolean),
    [keywordsText]
  );
  const domains = useMemo(
    () => domainsText.split("\n").map((s) => s.trim()).filter(Boolean),
    [domainsText]
  );
  const totalPairs = useMemo(
    () => Math.min(keywords.length, domains.length),
    [keywords.length, domains.length]
  );

  const keywordValidation = useMemo(() => validateKeywords(keywords), [keywords]);
  const domainValidation = useMemo(() => validateDomains(domains), [domains]);
  const pairValidation = useMemo(() => validatePairs(keywords, domains), [keywords, domains]);

  const canSubmit =
    keywordValidation.valid &&
    domainValidation.valid &&
    pairValidation.valid &&
    totalPairs > 0;

  async function handleSubmit() {
    if (submitting || !canSubmit || isStreaming) return;

    const cleanedDomains = domains.map(normalizeDomain);

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.set("keywords", keywordsText);
      fd.set("domains", cleanedDomains.join("\n"));
      fd.set("device", device);
      fd.set("location", location);

      const resp = await fetch(API_ENDPOINTS.STREAM_SAVE, { method: "POST", body: fd });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data?.session_id) throw new Error("Không nhận được session_id");

      onStart({
        sessionId: data.session_id,
        total: totalPairs,
        keywords,
        domains: cleanedDomains,
      });
    } catch (err: any) {
      onError(err?.message || "Gửi dữ liệu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  // Keyboard shortcut: Ctrl/Cmd+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (canSubmit && !submitting && !isStreaming) {
          handleSubmit();
        }
      }
    };

    const formElement = formRef.current;
    if (formElement) {
      formElement.addEventListener("keydown", handleKeyDown as any);
      return () => {
        formElement.removeEventListener("keydown", handleKeyDown as any);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, submitting, isStreaming]);

  const selectedLocation = locationOptions.find((opt) => opt.value === location);
  const selectedDevice = deviceOptions.find((opt) => opt.value === device);

  return (
    <Stack gap="md">
      {/* Configuration Options */}
      <Group grow>
        {/* Device Selection */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>Device</Text>
          <Group gap="xs">
            {deviceOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = device === opt.value;
              return (
                <Button
                  key={opt.value}
                  variant={isActive ? "filled" : "outline"}
                  size="sm"
                  onClick={() => setDevice(opt.value)}
                  flex={1}
                  leftSection={<Icon size={16} />}
                >
                  {opt.label}
                </Button>
              );
            })}
          </Group>
        </Stack>

        {/* Location Selection */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>Location</Text>
          <Group gap="xs">
            {locationOptions.map((opt) => {
              const isActive = location === opt.value;
              return (
                <Button
                  key={opt.value}
                  variant={isActive ? "filled" : "outline"}
                  size="sm"
                  onClick={() => setLocation(opt.value)}
                  flex={1}
                  title={opt.label}
                >
                  {opt.shortLabel}
                </Button>
              );
            })}
          </Group>
        </Stack>
      </Group>

      {/* Input Section */}
      <Box ref={formRef}>
        <Group grow align="flex-start">
          {/* Keywords */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Group gap={6}>
                <Type size={16} />
                <Text size="sm" fw={500}>Keywords</Text>
                {keywords.length > 0 && keywordValidation.valid && (
                  <Tooltip label="Valid keywords">
                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                      <Check size={14} color="var(--mantine-color-green-6)" />
                    </Box>
                  </Tooltip>
                )}
              </Group>
              <Text size="xs" c={keywords.length > 0 ? "blue" : "dimmed"} fw={keywords.length > 0 ? 500 : 400}>
                {keywords.length} {keywords.length === 1 ? "keyword" : "keywords"}
              </Text>
            </Group>
            <Textarea
              rows={7}
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              error={keywordValidation.issues.length > 0}
              styles={{
                input: {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  borderColor: keywordValidation.valid && keywords.length > 0
                    ? 'var(--mantine-color-green-6)'
                    : undefined,
                },
              }}
              placeholder="seo tools&#10;digital marketing&#10;content strategy"
            />
            {keywordValidation.issues.map((issue, i) => (
              <Group key={i} gap={6}>
                <AlertCircle size={14} color="var(--mantine-color-red-6)" />
                <Text size="xs" c="red">
                  {issue}
                </Text>
              </Group>
            ))}
          </Stack>

          {/* Domains */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Group gap={6}>
                <Globe size={16} />
                <Text size="sm" fw={500}>Domains</Text>
                {domains.length > 0 && domainValidation.valid && (
                  <Tooltip label="Valid domains">
                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                      <Check size={14} color="var(--mantine-color-green-6)" />
                    </Box>
                  </Tooltip>
                )}
              </Group>
              <Text size="xs" c={domains.length > 0 ? "blue" : "dimmed"} fw={domains.length > 0 ? 500 : 400}>
                {domains.length} {domains.length === 1 ? "domain" : "domains"}
              </Text>
            </Group>
            <Textarea
              rows={7}
              value={domainsText}
              onChange={(e) => setDomainsText(e.target.value)}
              error={domainValidation.issues.length > 0}
              styles={{
                input: {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  borderColor: domainValidation.valid && domains.length > 0
                    ? 'var(--mantine-color-green-6)'
                    : undefined,
                },
              }}
              placeholder="example.com&#10;mydomain.vn&#10;yoursite.org"
            />
            {domainValidation.issues.map((issue, i) => (
              <Group key={i} gap={6}>
                <AlertCircle size={14} color="var(--mantine-color-red-6)" />
                <Text size="xs" c="red">
                  {issue}
                </Text>
              </Group>
            ))}
          </Stack>
        </Group>

        {/* Validation Errors */}
        {pairValidation.issues.length > 0 && (
          <Alert color="red" icon={<AlertCircle size={16} />} mt="md">
            {pairValidation.issues[0]}
          </Alert>
        )}

        {/* Ready Summary */}
        {totalPairs > 0 && pairValidation.valid && (
          <Alert color="green" variant="light" mt="md" icon={<Check size={16} />}>
            <Group gap="lg" wrap="wrap">
              <Group gap={6}>
                <Type size={14} />
                <Text size="sm" c="dimmed">Keywords:</Text>
                <Text size="sm" fw={600}>{keywords.length}</Text>
              </Group>
              <Group gap={6}>
                <Globe size={14} />
                <Text size="sm" c="dimmed">Domains:</Text>
                <Text size="sm" fw={600}>{domains.length}</Text>
              </Group>
              <Group gap={6}>
                <Text size="sm" c="dimmed">Total Checks:</Text>
                <Text size="sm" fw={600} c="green">{totalPairs}</Text>
              </Group>
              {selectedDevice && (
                <Group gap={6}>
                  <selectedDevice.icon size={14} />
                  <Text size="sm" fw={500}>{selectedDevice.label}</Text>
                </Group>
              )}
              {selectedLocation && (
                <Text size="sm" fw={500}>{selectedLocation.label}</Text>
              )}
            </Group>
          </Alert>
        )}

        {/* Submit Button */}
        <Tooltip
          label={
            isStreaming
              ? "Check is in progress"
              : !canSubmit
              ? "Please enter valid keywords and domains"
              : "Press Ctrl+Enter (Cmd+Enter on Mac) to submit"
          }
          position="top"
        >
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting || isStreaming}
            variant={isStreaming ? "light" : "filled"}
            color={isStreaming ? "gray" : "blue"}
            fullWidth
            size="md"
            mt="md"
            leftSection={submitting || isStreaming ? null : <Play size={16} />}
            loading={submitting}
          >
            {isStreaming ? `Checking...` : submitting ? `Starting...` : `Start Check (${totalPairs})`}
          </Button>
        </Tooltip>
      </Box>
    </Stack>
  );
}
