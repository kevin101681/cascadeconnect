# Settings Tab Refactor

## Problem
The Settings menu was buried in a header dropdown, making admin/system settings hard to discover and navigate. Multiple complex interfaces (Internal Users, Homeowners, Data Import, Backend Status, Templates) were all modal-based, which didn't scale well for complex workflows.

## Goal
Create a dedicated **Settings Tab** on the main Dashboard navigation bar with a **split-pane layout** (similar to Builders tab) to organize settings into logical categories.

## Solution Architecture

### New Settings Tab Component
**File**: `components/dashboard/tabs/SettingsTab.tsx`

**Layout**: Split-pane design matching Builders tab
- **Left Pane**: Vertical navigation sidebar with 6 categories
- **Right Pane**: Dynamic content area showing selected category

### Categories Migrated from Header Dropdown

| Old Name | New Name | Icon | Component | Description |
|----------|----------|------|-----------|-------------|
| Internal Users | Internal Users | Users | `InternalUsersView` | Manage employees, contractors, builder users |
| Homeowners | Homeowners | Home | `HomeownersDirectoryView` | View/manage homeowner directory |
| Data Import | Data Import | Database | `DataImportView` | Import builder data, reset test data |
| *(Not in dropdown)* | Analytics | BarChart | *(Placeholder)* | System analytics and reports |
| Backend | Backend | Server | `BackendStatusView` | Monitor Netlify, Neon, email services |
| Settings | **Templates** | FileText | `TemplatesView` | Manage response templates |

**Ignored from Old Dropdown**:
- ❌ "Enroll Homeowner" - Not included (different workflow)
- ❌ "Switch to Homeowner" - Not included (user-switching logic)

### State Management

**Simple local state** for category selection:

```typescript
const [activeCategory, setActiveCategory] = useState<CategoryType>('internal-users');

type CategoryType = 
  | 'internal-users'
  | 'homeowners'
  | 'data-import'
  | 'analytics'
  | 'backend'
  | 'templates';
```

**No modals** - all interfaces render flat in the right pane.

## Architecture Patterns

### View Adapters (Embedded Versions)
The original components (`InternalUserManagement`, `HomeownersList`, `AdminDataPanel`, `BackendDashboard`, `Settings`) were all modal-based with `fixed inset-0` positioning. 

**Problem**: Can't embed modals inside a split-pane layout.

**Solution**: Created **view adapter components** that strip out modal styling and adapt for embedded use.

**New View Components**:
1. **`InternalUsersView.tsx`**
   - Wraps: `InternalUserManagement`
   - Features: Tabs for EMPLOYEES / SUBS / BUILDER_USERS
   - Layout: Header + horizontal tabs + content area

2. **`HomeownersDirectoryView.tsx`**
   - Wraps: `HomeownersList`
   - Features: Search, filter by builder, edit/delete
   - Layout: Header + content area

3. **`DataImportView.tsx`**
   - Wraps: `AdminDataPanel`
   - Features: Tabs for IMPORT / RESET
   - Layout: Header + horizontal tabs + content area

4. **`BackendStatusView.tsx`**
   - Wraps: `BackendDashboard`
   - Features: Tabs for OVERVIEW / NETLIFY / NEON / EMAILS
   - Layout: Header + horizontal tabs + content area

5. **`TemplatesView.tsx`**
   - Wraps: `Settings` (response templates)
   - Features: Create/edit response templates
   - Layout: Header + content area

### Adapter Pattern Benefits

✅ **Non-invasive**: Original modal components remain unchanged  
✅ **Reusable**: View adapters can be used anywhere (not just Settings tab)  
✅ **Lazy Loading**: All view components are lazy-loaded for performance  
✅ **Consistent Styling**: All adapters match the split-pane design language  

## User Flow

### Accessing Settings
1. User clicks **"Settings"** tab in main Dashboard navigation bar
2. Settings tab opens with split-pane layout
3. Left sidebar shows 6 categories
4. Right pane defaults to **"Internal Users"**

### Navigating Categories
1. User clicks a category in left sidebar (e.g., "Backend")
2. Right pane updates to show `BackendStatusView`
3. Category highlights in left sidebar
4. Horizontal tabs appear at top of right pane (if applicable)

### Working with Nested Tabs
Some views have **internal horizontal tabs** (rendered at the top of the right pane):

- **Internal Users**: EMPLOYEES / SUBS / BUILDER_USERS
- **Data Import**: IMPORT / RESET
- **Backend**: OVERVIEW / NETLIFY / NEON / EMAILS

These tabs are managed **internally** by each view component, not by the Settings tab itself.

## File Structure

```
components/
├── dashboard/
│   ├── tabs/
│   │   └── SettingsTab.tsx          # Main Settings tab component
│   └── views/                         # View adapters (non-modal versions)
│       ├── InternalUsersView.tsx
│       ├── HomeownersDirectoryView.tsx
│       ├── DataImportView.tsx
│       ├── BackendStatusView.tsx
│       └── TemplatesView.tsx
│
├── InternalUserManagement.tsx        # Original modal version (unchanged)
├── HomeownersList.tsx                # Original modal version (unchanged)
├── AdminDataPanel.tsx                # Original modal version (unchanged)
├── BackendDashboard.tsx              # Original modal version (unchanged)
└── Settings.tsx                      # Original modal version (unchanged)
```

## Props Interface

### SettingsTab Props

```typescript
interface SettingsTabProps {
  // Internal Users
  employees: InternalEmployee[];
  onAddEmployee: (emp: InternalEmployee) => void;
  onUpdateEmployee: (emp: InternalEmployee) => void;
  onDeleteEmployee: (id: string) => void;
  
  contractors: Contractor[];
  onAddContractor: (sub: Contractor) => void;
  onUpdateContractor: (sub: Contractor) => void;
  onDeleteContractor: (id: string) => void;

  builderUsers: BuilderUser[];
  builderGroups: BuilderGroup[];
  onAddBuilderUser: (user: BuilderUser, password?: string) => void;
  onUpdateBuilderUser: (user: BuilderUser, password?: string) => void;
  onDeleteBuilderUser: (id: string) => void;

  // Homeowners
  homeowners: Homeowner[];
  onUpdateHomeowner: (homeowner: Homeowner) => void;
  onDeleteHomeowner: (id: string) => void;

  // Data import
  onDataReset?: () => void;

  // Current user (for permissions)
  currentUser?: InternalEmployee;
}
```

## Styling

### Matches BuildersTab Design

**Left Sidebar**:
- Width: `w-full md:w-80`
- Border: `border-r border-surface-outline-variant`
- Background: `bg-surface dark:bg-gray-800`

**Right Pane**:
- Flex: `flex-1`
- Background: `bg-surface dark:bg-gray-800`
- Overflow: `overflow-hidden`

**Category Buttons**:
- Active: `bg-primary/10 text-primary border border-primary/20`
- Inactive: `text-surface-on hover:bg-surface-container border border-transparent`
- Icon + Label + Description layout

### Consistent with App Design Language
- Uses Material Design 3 tokens (`surface`, `primary`, `surface-on`, etc.)
- Supports dark mode
- Rounded corners (`rounded-lg`)
- Smooth transitions (`transition-all duration-200`)

## Implementation Status

### ✅ Completed
- [x] Created `SettingsTab.tsx` with split-pane layout
- [x] Created 5 view adapter components
- [x] Implemented category navigation
- [x] TypeScript compilation successful
- [x] Lazy loading for all views
- [x] Proper prop interfaces

### ⚠️ Placeholder Content
The view adapters currently show **placeholder content** (not full functionality). Next steps:

1. **Extract Internal Tab Logic**: Break out the tab-specific content from the original modal components
2. **Implement Full Forms**: Add create/edit forms for employees, contractors, builder users
3. **Connect Backend**: Wire up all CRUD operations to existing actions
4. **Test Workflows**: Ensure all user flows work in embedded context

### 🔄 Integration Required
- [ ] Add "Settings" to main Dashboard tab bar navigation
- [ ] Wire up props from Dashboard component state
- [ ] Remove old header dropdown menu (or keep for legacy compatibility)
- [ ] Update routing to handle `/settings` (if using URL-based nav)

## Testing Checklist

### Navigation
- [ ] Click "Settings" tab in main navigation
- [ ] Settings tab opens with Internal Users selected by default
- [ ] Click each category button in left sidebar
- [ ] Right pane updates to show correct view
- [ ] Active category highlights correctly

### Internal Tabs (if applicable)
- [ ] **Internal Users**: Switch between EMPLOYEES / SUBS / BUILDER_USERS
- [ ] **Data Import**: Switch between IMPORT / RESET
- [ ] **Backend**: Switch between OVERVIEW / NETLIFY / NEON / EMAILS

### Responsive Design
- [ ] Mobile: Left sidebar stacks above right pane
- [ ] Desktop: Side-by-side split-pane layout
- [ ] Transitions smooth between breakpoints

### Performance
- [ ] Views lazy-load on first access
- [ ] Loading spinner shows during lazy load
- [ ] No flash of unstyled content

## Migration Strategy

### Option 1: Full Replacement (Recommended)
1. Add "Settings" to main Dashboard tab bar
2. Wire up SettingsTab component
3. Remove header dropdown menu entirely
4. Users navigate via tab bar (cleaner UX)

### Option 2: Hybrid Approach
1. Keep header dropdown for quick access
2. Also add Settings tab for full-screen workflows
3. Both point to same view components
4. Users can choose their preferred entry point

## Benefits

### For Users
✅ **Discoverable**: Settings clearly visible in main navigation  
✅ **Organized**: Categories logically grouped in sidebar  
✅ **Contextual**: No jarring modals interrupting workflow  
✅ **Scalable**: Easy to add new categories in the future  

### For Developers
✅ **Maintainable**: Adapter pattern keeps original components intact  
✅ **Testable**: View components can be tested independently  
✅ **Performant**: Lazy loading reduces initial bundle size  
✅ **Extensible**: Easy to add new settings categories  

## Build Status

✅ **TypeScript**: Compiles successfully  
✅ **Commit**: `a41de92` - "feat: create Settings tab with split-pane layout"  
✅ **Files Created**: 6 files (1 tab, 5 views)  
✅ **Lines Added**: 668 insertions  
✅ **No Breaking Changes**: Original components unchanged

## Next Steps

1. **Add to Dashboard Navigation**:
   - Update `Dashboard.tsx` to include "Settings" tab
   - Wire up `<SettingsTab>` component with props

2. **Implement Full View Logic**:
   - Extract tab-specific content from original modal components
   - Implement forms, tables, and CRUD operations in view adapters

3. **Remove Header Dropdown** (optional):
   - Deprecate old dropdown menu
   - Update user guidance/docs

Ready for integration and testing!
