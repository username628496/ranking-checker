# 🎨 Mantine UI Migration Quick Reference

## Component Mapping (shadcn/ui → Mantine)

### Layout & Structure
```typescript
// shadcn/ui
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Mantine UI
import { Card, Text } from "@mantine/core"
<Card withBorder shadow="sm">
  <Text fw={600} size="sm" mb="md">Title</Text>
  <div>Content</div>
</Card>
```

### Buttons
```typescript
// shadcn/ui
<Button variant="default" size="sm">Click</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>

// Mantine UI
<Button variant="filled" size="sm">Click</Button>
<Button variant="outline">Outline</Button>
<Button variant="subtle">Ghost</Button>
```

### Inputs
```typescript
// shadcn/ui
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
<Label>Name</Label>
<Input placeholder="Enter name" />

// Mantine UI
import { TextInput } from "@mantine/core"
<TextInput label="Name" placeholder="Enter name" />
```

### Badges
```typescript
// shadcn/ui
<Badge variant="default">New</Badge>

// Mantine UI
<Badge variant="filled" color="blue">New</Badge>
```

### Separators
```typescript
// shadcn/ui
<Separator />

// Mantine UI
<Divider />
```

### Progress
```typescript
// shadcn/ui
<Progress value={50} />

// Mantine UI
<Progress value={50} />  // Same!
```

### Alerts
```typescript
// shadcn/ui
<Alert variant="destructive">
  <AlertCircle />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Message</AlertDescription>
</Alert>

// Mantine UI
<Alert color="red" icon={<AlertCircle size={16} />} title="Error">
  Message
</Alert>
```

## Quick Tips
1. **No more className** - Use Mantine's style props
2. **Use Stack/Group** instead of div with flex
3. **Colors**: Use color="blue", c="dimmed", etc.
4. **Spacing**: gap="md", p="md", mt="xs"
5. **Responsive**: Use `visibleFrom="md"`, `hiddenFrom="sm"`
