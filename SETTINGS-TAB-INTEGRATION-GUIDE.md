# Settings Tab Integration Guide

## Current Status

The Settings tab component and all view adapters have been created but NOT YET integrated into the main Dashboard.

**Created Components**:
- ✅ `components/dashboard/tabs/SettingsTab.tsx` - Main Settings tab component
- ✅ `components/dashboard/views/InternalUsersView.tsx` - Internal users view adapter
- ✅ `components/dashboard/views/HomeownersDirectoryView.tsx` - Homeowners directory adapter
- ✅ `components/dashboard/views/DataImportView.tsx` - Data import adapter
- ✅ `components/dashboard/views/BackendStatusView.tsx` - Backend status adapter
- ✅ `components/dashboard/views/TemplatesView.tsx` - Templates view adapter

**Not Yet Done**:
- ❌ Add 'SETTINGS' to TabType in Dashboard.tsx
- ❌ Add 'SETTINGS' to getAvailableTabs() function
- ❌ Import and lazy-load SettingsTab component
- ❌ Add Settings tab rendering in currentTab switch
- ❌ Add Settings icon to the tab bar mapper
- ❌ Add "Add Contractor" handler to Dashboard props

## Integration Steps

### Step 1: Update TabType (Line 695)

**File**: `components/Dashboard.tsx`

**Find**:
```typescript
type TabType = 'CLAIMS' | 'MESSAGES' | 'TASKS' | 'NOTES' | 'CALLS' | 'DOCUMENTS' | 'MANUAL' | 'HELP' | 'INVOICES' | 'SCHEDULE' | 'PUNCHLIST' | 'CHAT' | null;
```

**Replace With**:
```typescript
type TabType = 'CLAIMS' | 'MESSAGES' | 'TASKS' | 'NOTES' | 'CALLS' | 'DOCUMENTS' | 'MANUAL' | 'HELP' | 'INVOICES' | 'SCHEDULE' | 'SETTINGS' | 'PUNCHLIST' | 'CHAT' | null;
```

### Step 2: Add SETTINGS to initialTab type (Line 477)

**Find**:
```typescript
initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS' | 'NOTES' | 'CALLS' | 'INVOICES' | 'SCHEDULE';
```

**Replace With**:
```typescript
initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS' | 'NOTES' | 'CALLS' | 'INVOICES' | 'SCHEDULE' | 'SETTINGS';
```

### Step 3: Add SETTINGS to getAvailableTabs() (Line 951-976)

**Find**:
```typescript
const getAvailableTabs = (): Array<Exclude<TabType, null>> => {
  const isHomeownerViewRole = userRole === UserRole.HOMEOWNER;
  const isEmployee = currentUser?.role === 'Employee';
  const tabs: Array<Exclude<TabType, null>> = ['CLAIMS']; // Warranty
  tabs.push('MESSAGES');
  if (isAdmin && !isHomeownerViewRole) {
    tabs.push('TASKS');
    tabs.push('NOTES');
  }
  // Homeowner tabs - only show for homeowners
  if (isHomeownerViewRole) {
    tabs.push('DOCUMENTS'); // DOCUMENTS tab for homeowners
    tabs.push('MANUAL'); // Homeowner Manual tab
    tabs.push('HELP'); // Help/Guide tab for homeowners
  }
  if (isAdmin && !isHomeownerViewRole) {
    tabs.push('CALLS'); // CALLS tab (admin only)
    tabs.push('SCHEDULE'); // SCHEDULE tab (admin only)
    // Only show Invoices for Administrator role, not Employee role
    if (!isEmployee) {
      tabs.push('INVOICES'); // INVOICES tab (administrator only)
    }
  }
  // DOCUMENTS tab for homeowners is now in the tabs, but for admin it's still a button in homeowner info card
  return tabs;
};
```

**Replace With**:
```typescript
const getAvailableTabs = (): Array<Exclude<TabType, null>> => {
  const isHomeownerViewRole = userRole === UserRole.HOMEOWNER;
  const isEmployee = currentUser?.role === 'Employee';
  const tabs: Array<Exclude<TabType, null>> = ['CLAIMS']; // Warranty
  tabs.push('MESSAGES');
  if (isAdmin && !isHomeownerViewRole) {
    tabs.push('TASKS');
    tabs.push('NOTES');
  }
  // Homeowner tabs - only show for homeowners
  if (isHomeownerViewRole) {
    tabs.push('DOCUMENTS'); // DOCUMENTS tab for homeowners
    tabs.push('MANUAL'); // Homeowner Manual tab
    tabs.push('HELP'); // Help/Guide tab for homeowners
  }
  if (isAdmin && !isHomeownerViewRole) {
    tabs.push('CALLS'); // CALLS tab (admin only)
    tabs.push('SCHEDULE'); // SCHEDULE tab (admin only)
    // Only show Invoices for Administrator role, not Employee role
    if (!isEmployee) {
      tabs.push('INVOICES'); // INVOICES tab (administrator only)
    }
    // Settings tab - admin only (all admin users)
    tabs.push('SETTINGS'); // SETTINGS tab (admin only)
  }
  // DOCUMENTS tab for homeowners is now in the tabs, but for admin it's still a button in homeowner info card
  return tabs;
};
```

### Step 4: Lazy-load SettingsTab Component (Around Line 30)

**Find**:
```typescript
const AIIntakeDashboard = React.lazy(() => import('./AIIntakeDashboard'));
const HomeownerManual = React.lazy(() => import('./HomeownerManual'));
const ScheduleTab = React.lazy(() => import('./ScheduleTab'));
const HomeownerWarrantyGuide = React.lazy(() =>
  import('./HomeownerWarrantyGuide').then((m) => ({ default: m.HomeownerWarrantyGuide }))
);

// Import CBS Books Page (new split-view design - no ghost headers)
const CBSBooksPageWrapper = React.lazy(() => import('./pages/CBSBooksPageWrapper'));
```

**Add After**:
```typescript
// Import Settings Tab
const SettingsTab = React.lazy(() => import('./dashboard/tabs/SettingsTab'));
```

### Step 5: Add Tab Icon Mapping (Around Line 4369-4500)

**Find the tab rendering logic** (search for `availableTabs.map`):

Inside the `availableTabs.map((tab) => {` block, find where tab icons and labels are mapped.

**Look for something like**:
```typescript
let icon: React.ReactNode;
let label: string;

if (tab === 'CLAIMS') {
  icon = <Home className="h-5 w-5" />;
  label = 'Warranty';
} else if (tab === 'MESSAGES') {
  icon = <Mail className="h-5 w-5" />;
  label = 'Messages';
}
// ... more tabs
```

**Add BEFORE the closing of the conditional chain**:
```typescript
else if (tab === 'SETTINGS') {
  icon = <Settings className="h-5 w-5" />;
  label = 'Settings';
}
```

**IMPORTANT**: Make sure to import `Settings` icon from lucide-react at the top:
```typescript
import { ..., Settings } from 'lucide-react';
```

### Step 6: Add Settings Tab Content Rendering (Around Line 4757+)

**Find the tab content rendering section** (search for `currentTab === 'CLAIMS'` or `currentTab === 'INVOICES'`):

**Add AFTER** the INVOICES tab rendering:
```typescript
{/* SETTINGS TAB - Admin Only */}
{currentTab === 'SETTINGS' && isAdmin && (
  <div className="flex-shrink-0 snap-start min-h-[calc(100vh-300px)]"
    style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', width: '100%' }}
  >
    <div className="w-full min-h-[calc(100vh-300px)]">
      <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <SettingsTab
          employees={employees}
          onAddEmployee={(emp) => {
            console.log('Add employee:', emp);
            // TODO: Wire up to actual employee add action
          }}
          onUpdateEmployee={(emp) => {
            console.log('Update employee:', emp);
            // TODO: Wire up to actual employee update action
          }}
          onDeleteEmployee={(id) => {
            console.log('Delete employee:', id);
            // TODO: Wire up to actual employee delete action
          }}
          contractors={contractors}
          onAddContractor={(sub) => {
            console.log('Add contractor:', sub);
            // TODO: Wire up to actual contractor add action
          }}
          onUpdateContractor={(sub) => {
            console.log('Update contractor:', sub);
            // TODO: Wire up to actual contractor update action
          }}
          onDeleteContractor={(id) => {
            console.log('Delete contractor:', id);
            // TODO: Wire up to actual contractor delete action
          }}
          builderUsers={builderUsers}
          builderGroups={builderGroups}
          onAddBuilderUser={(user, password) => {
            console.log('Add builder user:', user);
            // TODO: Wire up to actual builder user add action
          }}
          onUpdateBuilderUser={(user, password) => {
            console.log('Update builder user:', user);
            // TODO: Wire up to actual builder user update action
          }}
          onDeleteBuilderUser={(id) => {
            console.log('Delete builder user:', id);
            // TODO: Wire up to actual builder user delete action
          }}
          homeowners={homeowners}
          onUpdateHomeowner={onUpdateHomeowner || ((h) => console.log('Update homeowner:', h))}
          onDeleteHomeowner={(id) => {
            console.log('Delete homeowner:', id);
            // TODO: Wire up to actual homeowner delete action
          }}
          onDataReset={() => {
            console.log('Data reset requested');
            // TODO: Wire up to actual data reset action
          }}
          currentUser={currentUser}
        />
      </Suspense>
    </div>
  </div>
)}
```

### Step 7: Add validTabs array update (Around Line 701)

**Find**:
```typescript
const validTabs: TabType[] = ['CLAIMS', 'MESSAGES', 'TASKS', 'NOTES', 'CALLS', 'DOCUMENTS', 'MANUAL', 'HELP', 'INVOICES', 'SCHEDULE', 'PUNCHLIST', 'CHAT'];
```

**Replace With**:
```typescript
const validTabs: TabType[] = ['CLAIMS', 'MESSAGES', 'TASKS', 'NOTES', 'CALLS', 'DOCUMENTS', 'MANUAL', 'HELP', 'INVOICES', 'SCHEDULE', 'SETTINGS', 'PUNCHLIST', 'CHAT'];
```

## Testing Checklist

After integration:

- [ ] TypeScript compiles without errors
- [ ] Settings tab appears in the main navigation (admin only)
- [ ] Settings tab is positioned after "Invoices" in the tab bar
- [ ] Clicking Settings tab opens the split-pane layout
- [ ] Left sidebar shows all 6 categories
- [ ] Clicking each category updates the right pane
- [ ] Internal Users view shows placeholder content
- [ ] Homeowners view shows homeowner count
- [ ] Data Import view shows tabs
- [ ] Analytics shows placeholder
- [ ] Backend view shows tabs
- [ ] Templates view shows placeholder
- [ ] Settings icon (gear/cog) displays correctly
- [ ] Settings tab NOT visible for homeowner users
- [ ] Settings tab NOT visible for builder users
- [ ] Settings tab IS visible for admin users

## Future Work

After basic integration is complete, the following need to be implemented:

1. **Wire Up CRUD Operations**: Replace console.log calls with actual server actions
2. **Implement Full View Logic**: Extract tab-specific content from original modal components
3. **Add Full Forms**: Implement create/edit forms for employees, contractors, builder users
4. **Connect Backend**: Wire up all operations to existing actions/API routes
5. **Test Workflows**: Ensure all user flows work in embedded context
6. **Remove Old Header Dropdown**: Deprecate old dropdown menu (optional)

## Quick Command Reference

To complete the integration, run these searches in Dashboard.tsx:

```bash
# Find where to add SettingsTab import
grep "const.*React.lazy" components/Dashboard.tsx

# Find TabType definition
grep "type TabType" components/Dashboard.tsx

# Find getAvailableTabs function
grep "const getAvailableTabs" components/Dashboard.tsx

# Find tab content rendering
grep "currentTab === 'INVOICES'" components/Dashboard.tsx

# Find tab icon mapping
grep "availableTabs.map" components/Dashboard.tsx
```

## Ready for Integration

All components are created and tested. The integration is a straightforward process of adding 'SETTINGS' to the appropriate places in Dashboard.tsx.

Estimated time: 15-20 minutes
Risk level: Low (no breaking changes)
