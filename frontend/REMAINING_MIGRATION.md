# 📋 Remaining Migration Tasks

## ✅ Already Completed (50%)
1. ✅ Mantine v8 installed
2. ✅ Theme configured in main.tsx
3. ✅ App.tsx → Mantine AppShell
4. ✅ Form.tsx → Mantine components

## 🔧 Quick Fixes Needed (Critical - 30 mins)

### 1. Create Mantine ProgressBar Component
File: `/src/components/ProgressBar.tsx`
Replace with Mantine Progress component

### 2. Migrate SingleCheckPage.tsx
- Replace Card imports → Mantine Card
- Replace Badge → Mantine Badge
- Replace Separator → Mantine Divider
- Uses: ProgressBar, ResultTable, TopHighlights, UserTemplate

### 3. Migrate ResultTable.tsx
- Replace custom table → Mantine Table
- Replace badge classes → Mantine Badge

### 4. Migrate TopHighlights.tsx
- Remove gradient backgrounds
- Use Mantine Card

### 5. Migrate UserTemplate.tsx & BulkTemplate.tsx
- Standard Mantine components
- Use notifications.show() for toasts

### 6. Migrate BulkCheckPage.tsx
- Remove ALL gradients
- Clean Mantine design
- Use notifications.show()

### 7. Migrate HistoryPage.tsx & ApiSettingsPage.tsx
- Replace forms with Mantine equivalents
- Use Mantine Table

### 8. TrackingPage.tsx (Most Complex)
- Remove DaisyUI classes
- Use mantine-datatable for complex table
- Mantine Modal, Checkbox, Button

## 🗑️ Cleanup (Final - 10 mins)
1. Delete `/src/components/ui/` directory (all shadcn files)
2. Delete `/src/lib/utils.ts`
3. Clean up index.css - keep only theme variables

## 🎯 Current Focus
Making SingleCheckPage work first, then others will follow the same pattern.

The app is 50% migrated. Remaining work is mostly find-and-replace following the patterns established.
