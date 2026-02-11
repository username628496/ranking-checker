import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Search,
  Calendar,
  Tag,
  Check,
  Save,
  Play,
} from "lucide-react";
import { Button, TextInput, Textarea, Stack, Group, Box, Text, SimpleGrid, Card, Badge, ActionIcon } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { formatVietnameseDate } from "@/utils/dateFormatter";

type BulkTemplate = {
  id: number;
  name: string;
  keywords: string[];
  created_at: string;
};

type Props = {
  onUseTemplate?: (keywords: string) => void;
};

const STORAGE_KEY = "bulk_templates";

export default function BulkTemplate({ onUseTemplate }: Props) {
  const [templates, setTemplates] = useState<BulkTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load templates from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTemplates(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  }, []);

  // Save templates to localStorage
  function saveToStorage(updatedTemplates: BulkTemplate[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
      setTemplates(updatedTemplates);
    } catch (err) {
      console.error("Failed to save templates:", err);
    }
  }

  function handleSave() {
    if (!name) {
      notifications.show({
        title: 'Error',
        message: 'Please enter template name',
        color: 'red',
      });
      return;
    }

    const keywordList = keywords.split("\n").map((s) => s.trim()).filter(Boolean);
    if (keywordList.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please enter at least one keyword',
        color: 'red',
      });
      return;
    }

    const newTemplate: BulkTemplate = {
      id: editId || Date.now(),
      name,
      keywords: keywordList,
      created_at: new Date().toISOString(),
    };

    let updatedTemplates: BulkTemplate[];
    if (editId) {
      updatedTemplates = templates.map((t) => (t.id === editId ? newTemplate : t));
    } else {
      updatedTemplates = [...templates, newTemplate];
    }

    saveToStorage(updatedTemplates);
    resetForm();
    notifications.show({
      title: 'Success',
      message: editId ? 'Template updated' : 'Template created',
      color: 'green',
      icon: <Check size={16} />,
    });
  }

  function resetForm() {
    setName("");
    setKeywords("");
    setEditId(null);
    setShowForm(false);
  }

  function handleEdit(t: BulkTemplate) {
    setEditId(t.id);
    setName(t.name);
    setKeywords(t.keywords.join("\n"));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this template?")) {
      const updatedTemplates = templates.filter((t) => t.id !== id);
      saveToStorage(updatedTemplates);
      notifications.show({
        title: 'Deleted',
        message: 'Template deleted successfully',
        color: 'red',
      });
    }
  }

  function handleCopy(list: string[]) {
    navigator.clipboard.writeText(list.join("\n"));
    notifications.show({
      message: 'Copied keywords',
      color: 'green',
      icon: <Check size={16} />,
    });
  }

  function handleQuickUse(t: BulkTemplate) {
    const keywordsText = t.keywords.join("\n");

    if (onUseTemplate) {
      onUseTemplate(keywordsText);
      notifications.show({
        message: 'Template loaded!',
        color: 'green',
        icon: <Check size={16} />,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <Text size="sm" c="dimmed">{templates.length} templates</Text>
        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "filled"}
          size="sm"
          leftSection={showForm ? <X size={16} /> : <Plus size={16} />}
        >
          {showForm ? "Cancel" : "New Template"}
        </Button>
      </Group>

      {/* Form */}
      {showForm && (
        <Card withBorder shadow="sm" p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
          <Text fw={600} size="sm" mb="md">
            {editId ? "Edit Template" : "Create Template"}
          </Text>

          <Stack gap="md">
            <TextInput
              label="Template Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., SEO Keywords"
            />

            <Textarea
              label="Keywords (one per line)"
              rows={6}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="seo tools&#10;digital marketing&#10;content strategy"
              styles={{ input: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
            />

            <Group gap="xs">
              <Button onClick={handleSave} size="sm" leftSection={<Save size={16} />}>
                {editId ? "Update" : "Save"}
              </Button>
              <Button onClick={resetForm} variant="outline" size="sm">
                Cancel
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Search */}
      <TextInput
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leftSection={<Search size={16} />}
        rightSection={
          searchQuery ? (
            <ActionIcon variant="subtle" onClick={() => setSearchQuery("")}>
              <X size={16} />
            </ActionIcon>
          ) : null
        }
      />

      {/* Template Grid */}
      {filteredTemplates.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filteredTemplates.map((t) => (
            <Card key={t.id} withBorder shadow="sm" p="md">
              {/* Header */}
              <Stack gap="xs" mb="sm">
                <Text size="sm" fw={600} lineClamp={1}>{t.name}</Text>
                <Group gap="md">
                  <Group gap={4}>
                    <Tag size={12} />
                    <Text size="xs" c="dimmed">{t.keywords.length} keywords</Text>
                  </Group>
                  {t.created_at && (
                    <Group gap={4}>
                      <Calendar size={12} />
                      <Text size="xs" c="dimmed">{formatVietnameseDate(t.created_at)}</Text>
                    </Group>
                  )}
                </Group>
              </Stack>

              {/* Preview */}
              <Stack gap="xs" mb="sm" pb="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                <Group gap="xs">
                  {t.keywords.slice(0, 3).map((k, i) => (
                    <Badge key={i} variant="light" size="sm" maw={100} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={k}>
                      {k}
                    </Badge>
                  ))}
                  {t.keywords.length > 3 && (
                    <Badge variant="light" size="sm" color="gray">
                      +{t.keywords.length - 3}
                    </Badge>
                  )}
                </Group>
              </Stack>

              {/* Actions */}
              <Stack gap="xs">
                <Group gap="xs">
                  <Button
                    onClick={() => handleQuickUse(t)}
                    size="xs"
                    flex={1}
                    leftSection={<Play size={14} />}
                  >
                    Use
                  </Button>
                  <ActionIcon
                    onClick={() => handleCopy(t.keywords)}
                    variant="light"
                    size="lg"
                    title="Copy keywords"
                  >
                    <Tag size={16} />
                  </ActionIcon>
                  <ActionIcon
                    onClick={() => handleEdit(t)}
                    variant="light"
                    size="lg"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </ActionIcon>
                </Group>
                <Button
                  onClick={() => handleDelete(t.id)}
                  variant="light"
                  color="red"
                  size="xs"
                  fullWidth
                  leftSection={<Trash2 size={14} />}
                >
                  Delete
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <Stack align="center" gap="md" py="xl">
          <Box
            style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--mantine-radius-md)',
              backgroundColor: 'var(--mantine-color-gray-1)'
            }}
          >
            <Search size={24} color="var(--mantine-color-dimmed)" />
          </Box>
          <Text fw={600} size="sm">
            {searchQuery ? "No templates found" : "No templates yet"}
          </Text>
          <Text size="xs" c="dimmed" ta="center">
            {searchQuery
              ? "Try searching with different keywords"
              : "Create your first template to get started"}
          </Text>
          {!showForm && !searchQuery && (
            <Button onClick={() => setShowForm(true)} size="sm" leftSection={<Plus size={16} />}>
              Create Template
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
}
