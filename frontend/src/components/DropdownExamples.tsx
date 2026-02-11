import { UserMenu } from "./UserMenu";
import { ActionMenu } from "./ActionMenu";
import { FilterMenu } from "./FilterMenu";

export function DropdownExamples() {
  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Dropdown Menu Examples</h2>
        <p className="text-sm text-muted-foreground">
          Modern, compact dropdown menus with various styles and features
        </p>
      </div>

      {/* User Menu Example */}
      <div className="space-y-3 rounded-lg border bg-card p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">User Account Menu</h3>
          <p className="text-xs text-muted-foreground">
            Complete user menu with profile info, shortcuts, and notifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UserMenu />
          <span className="text-xs text-muted-foreground">
            Click to see user menu with shortcuts
          </span>
        </div>
      </div>

      {/* Action Menu Example */}
      <div className="space-y-3 rounded-lg border bg-card p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Actions Menu</h3>
          <p className="text-xs text-muted-foreground">
            Context menu for table rows with common actions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ActionMenu
            onView={() => console.log("View")}
            onEdit={() => console.log("Edit")}
            onCopy={() => console.log("Copy")}
            onDownload={() => console.log("Download")}
            onShare={() => console.log("Share")}
            onArchive={() => console.log("Archive")}
            onDelete={() => console.log("Delete")}
          />
          <span className="text-xs text-muted-foreground">
            Three-dot menu for item actions
          </span>
        </div>
      </div>

      {/* Filter Menu Example */}
      <div className="space-y-3 rounded-lg border bg-card p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Filter & Sort Menu</h3>
          <p className="text-xs text-muted-foreground">
            Advanced filtering with checkboxes and radio groups
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FilterMenu />
          <span className="text-xs text-muted-foreground">
            Filter with sort options and checkboxes
          </span>
        </div>
      </div>

      {/* Features List */}
      <div className="rounded-lg border bg-muted/50 p-6">
        <h3 className="mb-3 text-sm font-semibold">Features</h3>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Compact design with text-xs baseline (12px)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Icons with consistent h-4 w-4 sizing</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Keyboard shortcuts display (⌘ + key)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Notification badges and status indicators</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Destructive actions with red text</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Radio groups for single selection</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Checkboxes for multiple selection</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Proper spacing and separators</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
