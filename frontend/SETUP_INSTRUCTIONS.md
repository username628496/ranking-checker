# Frontend Setup Instructions - shadcn/ui Migration

## Required npm Packages

Run the following commands to install all required dependencies:

```bash
cd frontend

# Core dependencies for shadcn/ui
npm install clsx tailwind-merge class-variance-authority

# Radix UI primitives (required by shadcn/ui components)
npm install @radix-ui/react-slot
npm install @radix-ui/react-tabs
npm install @radix-ui/react-label
npm install @radix-ui/react-select

# Tailwind CSS animation support
npm install tailwindcss-animate

# Existing dependencies (should already be installed)
# npm install lucide-react axios react react-dom
```

## Quick Install (All at once)

```bash
npm install clsx tailwind-merge class-variance-authority @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-label @radix-ui/react-select tailwindcss-animate
```

## Verify Installation

After installing, your `package.json` should include:

```json
{
  "dependencies": {
    "axios": "^1.12.2",
    "clsx": "^2.1.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.542.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "recharts": "^3.2.1",
    "tailwind-merge": "^2.2.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "tailwindcss-animate": "^1.0.7"
  }
}
```

## Files Created/Modified

### New Files
- `src/lib/utils.ts` - Utility function for class name merging
- `src/components/ui/button.tsx` - Button component
- `src/components/ui/card.tsx` - Card component
- `src/components/ui/tabs.tsx` - Tabs component
- `src/components/ui/input.tsx` - Input component
- `src/components/ui/label.tsx` - Label component
- `src/components/ui/textarea.tsx` - Textarea component
- `src/components/ui/select.tsx` - Select component
- `components.json` - shadcn/ui configuration

### Modified Files
- `tailwind.config.ts` - Updated for shadcn/ui CSS variables
- `src/index.css` - Added shadcn/ui CSS variables for light/dark mode
- `src/App.tsx` - Refactored to use shadcn/ui Tabs component

## Running the Application

After installation:

```bash
# Development
npm run dev

# Build for production
npm run build
```

## Architecture Changes

### Before (Old Stack)
- DaisyUI for components
- Custom tab navigation with state management
- Mixed styling approaches

### After (New Stack - shadcn/ui)
- shadcn/ui components (built on Radix UI)
- Radix UI Tabs for navigation
- Consistent Tailwind CSS styling
- Full TypeScript support
- Better accessibility (Radix UI primitives)

## Key Benefits

1. **No Component Library Lock-in**: shadcn/ui components are copied into your project, not imported from a package
2. **Full Customization**: You own the component code
3. **Better TypeScript Support**: Full type safety
4. **Accessibility**: Built on Radix UI primitives (WAI-ARIA compliant)
5. **Modern Stack**: Uses latest React patterns
6. **No jQuery/Bootstrap**: Pure React components

## Troubleshooting

### If you see "Cannot find module" errors:
```bash
npm install
```

### If Tailwind classes don't work:
```bash
npm run dev
# Vite should auto-restart
```

### If dark mode doesn't work:
Check that `ThemeContext` properly sets the `dark` class on the `<html>` element.

## Next Steps

After setup, all pages will use shadcn/ui components:
- ✅ App.tsx - Using shadcn/ui Tabs
- ⏳ Pages need to be refactored to use shadcn/ui Card, Button, Input, etc.

The refactoring provides a modern, maintainable codebase with excellent DX (Developer Experience).
