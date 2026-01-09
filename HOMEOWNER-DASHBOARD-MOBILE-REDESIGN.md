# 🏠 Homeowner Dashboard Mobile Redesign

## Overview

A modern, field-service-style mobile interface for the Homeowner Dashboard. This redesign transforms the previous long vertical scroll with pill buttons into a clean, card-based categorized layout optimized for mobile workflows.

---

## 🎯 Design Goals Achieved

1. **✅ Collapsible Header** - Name and address shown by default; Builder, Email, and Closing Date expand on demand
2. **✅ Quick Actions Bar** - 4 prominent circular buttons for Call, SMS, Navigate, and Email with native handlers
3. **✅ Categorized Modules** - Clean grouping into Project, Communication, and Financial sections
4. **✅ Modern Card UI** - White cards on light gray background with subtle shadows and hover states

---

## 📱 Component Structure

### File Location
```
components/HomeownerDashboardMobile.tsx
```

### Component Interface

```typescript
interface HomeownerDashboardMobileProps {
  homeowner: Homeowner;
  onNavigateToModule: (module: string) => void;
}
```

---

## 🎨 UI Layout

### 1. Collapsible Header Card
**Collapsed State (Default):**
- Homeowner Name (truncated)
- Address (line-clamped to 2 lines)
- Chevron expand/collapse button

**Expanded State:**
- Builder name
- Email address
- Closing date

### 2. Quick Actions Bar
Four circular buttons arranged horizontally:

| Icon | Color | Action | Native Handler |
|------|-------|--------|----------------|
| 📞 Phone | Blue | Call | `tel:` URI |
| 💬 Message | Green | SMS | `sms:` URI |
| 🧭 Navigation | Purple | Navigate | Google Maps URL |
| ✉️ Email | Orange | Email | `mailto:` URI |

**Features:**
- Circular buttons (w-16 h-16)
- Colored backgrounds with hover states
- Active scale animation (`active:scale-95`)
- Shadow elevations on hover

### 3. Categorized Module Sections

#### **Project Section** (2x2 Grid)
- 📋 Tasks
- 📅 Schedule
- 🏷️ BlueTag
- 🛡️ Warranty

#### **Communication Section** (3-column Grid)
- 💬 Messages
- 📝 Notes
- 📞 Calls

#### **Financial Section** (2x1 Grid)
- 📄 Invoices
- 💵 Payroll

---

## 🔧 Integration Guide

### Step 1: Import the Component

```typescript
import HomeownerDashboardMobile from './components/HomeownerDashboardMobile';
```

### Step 2: Replace Existing Homeowner View

**In your main `Dashboard.tsx` component**, locate the homeowner view rendering logic and replace it with:

```typescript
// For mobile view (or responsive)
{isMobile && effectiveHomeowner && (
  <HomeownerDashboardMobile
    homeowner={effectiveHomeowner}
    onNavigateToModule={(module) => {
      // Map module strings to your existing tab state
      setCurrentTab(module as any);
    }}
  />
)}
```

### Step 3: Map Module Navigation

The `onNavigateToModule` callback receives these strings:

```typescript
'TASKS' | 'SCHEDULE' | 'BLUETAG' | 'CLAIMS' | 
'MESSAGES' | 'NOTES' | 'CALLS' | 'INVOICES' | 'PAYROLL'
```

Map these to your existing tab/view state:

```typescript
const handleModuleNavigation = (module: string) => {
  switch (module) {
    case 'BLUETAG':
      // Open BlueTag app/modal
      setShowPunchListApp(true);
      break;
    case 'CLAIMS':
      setCurrentTab('CLAIMS');
      break;
    case 'MESSAGES':
      setCurrentTab('MESSAGES');
      break;
    // ... handle other cases
    default:
      setCurrentTab(module as any);
  }
};
```

---

## 🎨 Styling Details

### Color Palette

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | `bg-gray-50` | `bg-gray-900` |
| Cards | `bg-white` | `bg-gray-800` |
| Borders | `border-gray-200` | `border-gray-700` |
| Text Primary | `text-gray-900` | `text-white` |
| Text Secondary | `text-gray-600` | `text-gray-300` |
| Module Buttons | `bg-gray-50` | `bg-gray-700/50` |

### Quick Action Colors

```css
Call Button:     bg-blue-500   hover:bg-blue-600
SMS Button:      bg-green-500  hover:bg-green-600
Navigate Button: bg-purple-500 hover:bg-purple-600
Email Button:    bg-orange-500 hover:bg-orange-600
```

### Animation Classes

- Header expand/collapse: `animate-in slide-in-from-top-2 fade-in duration-200`
- Button press: `active:scale-95`
- Hover shadow: `hover:shadow-md`

---

## 📐 Responsive Behavior

### Mobile First Design
- Optimized for screens < 768px
- Touch-friendly button sizes (minimum 44x44px tap targets)
- Native action handlers for seamless mobile UX

### Future Desktop Considerations
If you want to show this on larger screens, wrap in a max-width container:

```tsx
<div className="max-w-md mx-auto">
  <HomeownerDashboardMobile ... />
</div>
```

---

## 🔄 State Management

### Internal State (Component Level)
```typescript
const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
```

### External State (Parent Component)
- `currentTab` - Set by `onNavigateToModule` callback
- `showPunchListApp` - For BlueTag module
- Any modal/overlay states for other modules

---

## 🛠️ Customization Options

### Adding New Modules

1. **Add to the appropriate section** (Project/Communication/Financial):

```tsx
<ModuleButton
  icon={<YourIcon className="h-5 w-5" />}
  label="Your Module"
  onClick={() => onNavigateToModule('YOUR_MODULE')}
/>
```

2. **Update the grid layout** if needed:
   - Project: `grid-cols-2` (2x2 grid)
   - Communication: `grid-cols-3` (3 columns)
   - Financial: `grid-cols-2` (2 columns)

### Customizing Quick Actions

Replace or add action buttons by modifying the Quick Actions Bar section:

```tsx
<button
  onClick={handleYourAction}
  className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-YOUR_COLOR-500 hover:bg-YOUR_COLOR-600 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
>
  <YourIcon className="h-6 w-6" />
</button>
```

### Adjusting Header Fields

Add more fields to the expanded header:

```tsx
{isHeaderExpanded && (
  <div className="...">
    {/* Existing fields */}
    
    {homeowner.yourCustomField && (
      <div className="flex items-center text-sm">
        <span className="text-gray-500 dark:text-gray-400 w-24">Label:</span>
        <span className="text-gray-900 dark:text-white">{homeowner.yourCustomField}</span>
      </div>
    )}
  </div>
)}
```

---

## 🚀 Performance Considerations

1. **Lazy Module Loading** - Consider lazy-loading module content when navigating
2. **Icon Optimization** - Using Lucide React for tree-shakeable icons
3. **CSS-only Animations** - No JavaScript animation libraries needed

---

## 📦 Dependencies

Required from `lucide-react`:
```typescript
ChevronDown, ChevronUp, Phone, MessageCircle, Navigation, Mail,
ClipboardList, Calendar, Tag, Shield, MessagesSquare, StickyNote,
PhoneCall, FileText, DollarSign
```

---

## 🐛 Known Issues & Future Enhancements

### Current Limitations
- BlueTag module integration needs mapping (depends on your existing implementation)
- Payroll module might need different handling (verify if it exists in your app)

### Future Enhancements
1. **Badge Indicators** - Show unread counts on Messages, Tasks, etc.
2. **Recent Activity** - Add a "Recent" section showing last 3 actions
3. **Search Bar** - Quick search within modules
4. **Swipe Gestures** - Swipe to navigate between modules

---

## 📝 Example Usage

### Complete Integration Example

```typescript
// In your Dashboard.tsx or App.tsx

import HomeownerDashboardMobile from './components/HomeownerDashboardMobile';

const Dashboard = () => {
  const [currentTab, setCurrentTab] = useState<string | null>(null);
  const [showPunchListApp, setShowPunchListApp] = useState(false);
  const effectiveHomeowner = /* your homeowner data */;
  const isMobile = window.innerWidth < 768;

  const handleModuleNavigation = (module: string) => {
    if (module === 'BLUETAG') {
      setShowPunchListApp(true);
    } else {
      setCurrentTab(module);
    }
  };

  return (
    <>
      {isMobile && effectiveHomeowner ? (
        <HomeownerDashboardMobile
          homeowner={effectiveHomeowner}
          onNavigateToModule={handleModuleNavigation}
        />
      ) : (
        // Desktop view or existing layout
        <YourExistingDashboard />
      )}

      {/* Render module content based on currentTab */}
      {currentTab === 'CLAIMS' && <ClaimsView />}
      {currentTab === 'MESSAGES' && <MessagesView />}
      {/* ... other modules */}
    </>
  );
};
```

---

## ✅ Testing Checklist

- [ ] Header expands/collapses correctly
- [ ] Quick action buttons trigger native handlers (tel:, sms:, mailto:, maps)
- [ ] All module buttons navigate to correct views
- [ ] Dark mode styling is correct
- [ ] Touch targets are 44x44px minimum
- [ ] Animations are smooth (60fps)
- [ ] Works on iOS and Android
- [ ] Accessible (keyboard navigation, screen readers)

---

## 📸 Visual Comparison

### Before (Old Layout)
```
┌─────────────────────────────────────┐
│  [Large Homeowner Info Card]         │
│  Name, Address, Builder, Email, etc. │
│                                       │
│  [Pill Button: Warranty Claims]      │
│  [Pill Button: Tasks]                │
│  [Pill Button: Messages]             │
│  [Pill Button: Notes]                │
│  [Pill Button: Calls]                │
│  [Pill Button: Documents]            │
│  [Pill Button: Schedule]             │
│  [Pill Button: Invoices]             │
│  [Pill Button: Payroll]              │
│  [Pill Button: ...]                  │
└─────────────────────────────────────┘
```

### After (New Layout)
```
┌─────────────────────────────────────┐
│ Name                        [v]      │ ← Collapsible
│ Address                              │
├─────────────────────────────────────┤
│  (📞)  (💬)  (🧭)  (✉️)           │ ← Quick Actions
├─────────────────────────────────────┤
│ PROJECT                              │
│  [📋 Tasks]    [📅 Schedule]        │
│  [🏷️ BlueTag]  [🛡️ Warranty]       │
├─────────────────────────────────────┤
│ COMMUNICATION                        │
│  [💬 Messages] [📝 Notes] [📞 Calls]│
├─────────────────────────────────────┤
│ FINANCIAL                            │
│  [📄 Invoices]  [💵 Payroll]        │
└─────────────────────────────────────┘
```

---

## 🤝 Contributing

To modify this component:
1. Edit `components/HomeownerDashboardMobile.tsx`
2. Update this documentation
3. Test on both mobile and desktop
4. Verify dark mode appearance
5. Check accessibility with screen reader

---

## 📄 License

Part of the Cascade Connect project.

---

**Last Updated:** January 8, 2026  
**Version:** 1.0.0  
**Author:** Cascade Connect Development Team

