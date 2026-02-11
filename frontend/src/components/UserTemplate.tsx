import { useEffect, useState } from "react";
import {
 Plus,
 Trash2,
 Edit3,
 X,
 Search,
 Calendar,
 Tag,
 Globe,
 Check,
 Save,
 Play,
} from "lucide-react";
import { Button, TextInput, Textarea, Stack, Group, Box, Text, SimpleGrid, Card, Badge, ActionIcon, Notification } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
 fetchTemplates,
 createTemplate,
 updateTemplate,
 deleteTemplate,
} from "../api";
import { formatVietnameseDate } from "@/utils/dateFormatter";

type Template = {
 id: number;
 user_name: string;
 name: string;
 keywords: string[];
 domains: string[];
 created_at: string;
};

type Props = {
 onUseTemplate?: (keywords: string, domains: string) => void;
};

export default function UserTemplate({ onUseTemplate }: Props) {
 const [templates, setTemplates] = useState<Template[]>([]);
 const [showForm, setShowForm] = useState(false);
 const [userName, setUserName] = useState("");
 const [name, setName] = useState("");
 const [keywords, setKeywords] = useState("");
 const [domains, setDomains] = useState("");
 const [editId, setEditId] = useState<number | null>(null);
 const [searchQuery, setSearchQuery] = useState("");

 async function loadTemplates() {
 const data = await fetchTemplates();
 setTemplates(data);
 }

 useEffect(() => {
 loadTemplates();
 }, []);

 async function handleSave() {
 if (!userName || !name) {
 notifications.show({
 title: 'Error',
 message: 'Please fill in all fields',
 color: 'red',
 });
 return;
 }

 const payload = {
 user_name: userName,
 name,
 keywords: keywords.split("\n").map((s) => s.trim()).filter(Boolean),
 domains: domains.split("\n").map((s) => s.trim()).filter(Boolean),
 };

 if (editId) {
 await updateTemplate(editId, payload);
 setEditId(null);
 } else {
 await createTemplate(payload);
 }

 resetForm();
 loadTemplates();
 notifications.show({
 title: 'Success',
 message: editId ? 'Template updated' : 'Template created',
 color: 'green',
 icon: <Check size={16} />,
 });
 }

 function resetForm() {
 setUserName("");
 setName("");
 setKeywords("");
 setDomains("");
 setEditId(null);
 setShowForm(false);
 }

 function handleEdit(t: Template) {
 setEditId(t.id);
 setUserName(t.user_name);
 setName(t.name);
 setKeywords(t.keywords.join("\n"));
 setDomains(t.domains.join("\n"));
 setShowForm(true);
 window.scrollTo({ top: 0, behavior: "smooth" });
 }

 async function handleDelete(id: number) {
 if (confirm("Are you sure you want to delete this template?")) {
 await deleteTemplate(id);
 loadTemplates();
 notifications.show({
 title: 'Deleted',
 message: 'Template deleted successfully',
 color: 'red',
 });
 }
 }

 function handleCopy(list: string[], label: string) {
 navigator.clipboard.writeText(list.join("\n"));
 notifications.show({
 message: `Copied ${label}`,
 color: 'green',
 icon: <Check size={16} />,
 });
 }

 function handleQuickUse(t: Template) {
 const keywordsText = t.keywords.join("\n");
 const domainsText = t.domains.join("\n");

 if (onUseTemplate) {
 onUseTemplate(keywordsText, domainsText);
 notifications.show({
 message: 'Template loaded!',
 color: 'green',
 icon: <Check size={16} />,
 });
 window.scrollTo({ top: 0, behavior: "smooth" });
 }
 }

 const filteredTemplates = templates.filter((template) =>
 template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 template.user_name.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
 <Stack gap="md">
 {/* Header */}
 <Group justify="space-between">
 <Text size="sm" c="dimmed">{templates.length} templates</Text>
 <Button
 onClick={() => setShowForm(!showForm)}
 variant={showForm ? "outline" : "filled"}
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
 <Group grow>
 <TextInput
 label="User Name"
 value={userName}
 onChange={(e) => setUserName(e.target.value)}
 placeholder="User name"
 />
 <TextInput
 label="Template Name"
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Template name"
 />
 </Group>

 <Group grow align="flex-start">
 <Textarea
 label="Keywords (one per line)"
 rows={4}
 value={keywords}
 onChange={(e) => setKeywords(e.target.value)}
 placeholder="One keyword per line"
 styles={{ input: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
 />
 <Textarea
 label="Domains (one per line)"
 rows={4}
 value={domains}
 onChange={(e) => setDomains(e.target.value)}
 placeholder="One domain per line"
 styles={{ input: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
 />
 </Group>

 <Group gap="xs">
 <Button onClick={handleSave} leftSection={<Save size={16} />}>
 {editId ? "Update" : "Save"}
 </Button>
 <Button onClick={resetForm} variant="outline">
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
 <Text size="xs" c="dimmed">{t.user_name}</Text>
 </Stack>

 {/* Stats */}
 <Group gap="md" mb="sm">
 <Group gap={4}>
 <Tag size={12} />
 <Text size="xs" c="dimmed">{t.keywords.length}</Text>
 </Group>
 <Group gap={4}>
 <Globe size={12} />
 <Text size="xs" c="dimmed">{t.domains.length}</Text>
 </Group>
 {t.created_at && (
 <Group gap={4}>
 <Calendar size={12} />
 <Text size="xs" c="dimmed">{formatVietnameseDate(t.created_at)}</Text>
 </Group>
 )}
 </Group>

 {/* Preview */}
 <Stack gap="xs" mb="sm" pb="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
 <Group gap="xs">
 {t.keywords.slice(0, 2).map((k, i) => (
 <Badge key={i} variant="light" size="sm" maw={90} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={k}>
 {k}
 </Badge>
 ))}
 {t.keywords.length > 2 && (
 <Badge variant="light" size="sm" color="gray">
 +{t.keywords.length - 2}
 </Badge>
 )}
 </Group>
 <Group gap="xs">
 {t.domains.slice(0, 1).map((d, i) => (
 <Badge key={i} variant="light" size="sm" maw={120} style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d}>
 {d}
 </Badge>
 ))}
 {t.domains.length > 1 && (
 <Badge variant="light" size="sm" color="gray">
 +{t.domains.length - 1}
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
 onClick={() => handleCopy(t.keywords, "keywords")}
 variant="light"
 size="lg"
 title="Copy keywords"
 >
 <Tag size={16} />
 </ActionIcon>
 <ActionIcon
 onClick={() => handleCopy(t.domains, "domains")}
 variant="light"
 size="lg"
 title="Copy domains"
 >
 <Globe size={16} />
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
 <Button onClick={() => setShowForm(true)} leftSection={<Plus size={16} />}>
 Create Template
 </Button>
 )}
 </Stack>
 )}
 </Stack>
 );
}
