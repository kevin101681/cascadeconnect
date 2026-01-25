# SYSTEM ARCHITECTURE AUDIT: Entry Points & Router Mapping
**Date:** January 25, 2026  
**Goal:** Prevent "Ghost Files" by documenting the Single Source of Truth for each feature

---

## EXECUTIVE SUMMARY

✅ **GOOD NEWS:** Your architecture is **already unified**. There are NO competing routers or ghost files causing divergence between Admin and Homeowner views. All features route through centralized, shared components.

⚠️ **LEGACY CONCERNS:** Found some deprecated wrapper components and placeholder modals that should be cleaned up to prevent future confusion.

---

## 1. CLAIMS ROUTING: SINGLE SOURCE OF TRUTH ✅

### **The Truth:**
- **Component:** `components/ClaimDetail.tsx`
- **Loaded by:** `App.tsx` (line 29, lazy-loaded)
- **Rendered when:** `currentView === 'DETAIL'` (App.tsx line 5012)

### **How it Works:**
1. **App.tsx** is the root router
2. Both Admin and Homeowner dashboards set `currentView` and `selectedClaimId` in App state
3. App.tsx renders `<ClaimDetail>` in a Suspense boundary
4. **SAME COMPONENT** used for both Admin and Homeowner (with `isHomeownerView` prop)

### **URL Pattern:**
- Claims are accessed via internal state (`currentView` + `selectedClaimId`)
- URL params: `?claimId=xxx` triggers claim selection in dashboards
- No modal system - full-page navigation

### **Verification:**
```tsx
// App.tsx line 5012-5037
{currentView === 'DETAIL' && selectedClaim && (
  <React.Suspense fallback={<div className="p-6">Loading…</div>}>
    <ClaimDetail 
      claim={selectedClaim} 
      currentUserRole={userRole} 
      onUpdateClaim={handleUpdateClaim} 
      // ... shared by Admin and Homeowner
      isHomeownerView={userRole === UserRole.HOMEOWNER}
    />
  </React.Suspense>
)}
```

### **🚫 NO GHOST FILES FOUND**
- No `ClaimModal.tsx`
- No `ClaimDetailView.tsx` 
- No competing claim components

---

## 2. TASKS ROUTING: SINGLE SOURCE OF TRUTH ✅

### **The Truth:**
- **Component:** `components/TasksSheet.tsx`
- **Type:** Global drawer/modal (NOT a page-level component)
- **State Manager:** `stores/useTaskStore.ts` (Zustand store)
- **Rendered by:** App.tsx (line 5042), rendered ONCE globally

### **How it Works:**
1. **Global Component:** TasksSheet rendered at App.tsx root level
2. **Zustand Store:** `useTaskStore` manages open/close state
3. **Any component can open it:** Call `useTaskStore().openTasks()`
4. **Consistent everywhere:** Same UI for Admin, Homeowner, Mobile, Desktop

### **State Management:**
```tsx
// hooks/dashboard/useTasksData.ts
// Provides filter state and modal controls
const { 
  showNewTaskModal, 
  setShowNewTaskModal,
  filteredTasks 
} = useTasksData({ tasks, currentUserId });
```

### **Rendering:**
```tsx
// App.tsx line 5042
<TasksSheet
  onNavigateToClaim={(claimId) => {
    const claim = claims.find((c) => c.id === claimId);
    if (claim) {
      setSelectedClaimId(claimId);
      setCurrentView('DETAIL');
    }
  }}
  claims={claims}
/>
```

### **🚫 NO GHOST FILES FOUND**
- No `TaskModal.tsx`
- No competing task views
- Single TasksSheet used everywhere

---

## 3. CHAT ROUTING: SINGLE SOURCE OF TRUTH ✅

### **The Truth:**
**Two separate systems with different purposes:**

#### **A. Floating Chat Widget (Bottom-right FAB)**
- **Component:** `components/chat/ChatWidget.tsx`
- **Rendered by:** `components/layout/AppShell.tsx` (line 93-102)
- **Purpose:** Quick access popup chat (like Facebook Messenger)
- **Visibility:** Admin-only (hidden for homeowners)
- **State:** Managed by `contexts/UIContext.tsx`

#### **B. Full-Page Team Chat**
- **Component:** `components/TeamChat.tsx`
- **Rendered by:** Admin Dashboard via `components/dashboard/tabs/ChatTab.tsx`
- **Purpose:** Full-screen team chat interface (like Slack)
- **Visibility:** Admin-only, tab in dashboard

### **Shared Core Components:**
Both use the same underlying chat infrastructure:
- **ChatWindow:** `components/chat/ChatWindow.tsx` (message display + input)
- **ChatSidebar:** `components/chat/ChatSidebar.tsx` (channel list)
- **Service:** `services/internalChatService.ts` (API calls)
- **Real-time:** Pusher via `lib/pusher-client.ts`

### **Architecture:**
```
┌─────────────────────────────────────────┐
│          App Shell (Global)             │
│  - Invoices Modal                       │
│  - Chat Widget (Popup FAB) ✅           │
└─────────────────────────────────────────┘
             ↓ renders
┌─────────────────────────────────────────┐
│         Dashboard Tabs                   │
│  - Claims Tab                           │
│  - Messages Tab (SMS)                   │
│  - Chat Tab (Team Chat) ✅              │
└─────────────────────────────────────────┘

Both use:
→ ChatWindow.tsx (shared)
→ ChatSidebar.tsx (shared)
```

### **Legacy Component (Still Used):**
- **SMSChatView.tsx:** Separate SMS system for homeowner text messages
  - **Purpose:** Admin <-> Homeowner SMS conversations (external)
  - **Different from:** Team Chat (internal staff communication)
  - **Status:** Active, NOT redundant

### **🚫 NO GHOST FILES FOUND**
- Both chat systems are intentional and serve different purposes
- No competing chat components

---

## 4. INVOICES ROUTING: UNIFIED ✅

### **The Truth:**
- **Component:** `components/invoicing/InvoicesFullView.tsx`
- **Rendered by:** `components/layout/AppShell.tsx` (line 82-90)
- **State:** Managed by `contexts/UIContext.tsx`
- **Trigger:** `useUI().setShowInvoicesFullView(true)`

### **How it Works:**
1. Global overlay modal (z-index: 500)
2. Rendered at AppShell level (persists across route changes)
3. Can be opened from any dashboard (Admin or Homeowner)

### **Supporting Components (NOT Ghost Files):**
- `InvoiceFormPanel.tsx` - Edit form (used inside InvoicesFullView)
- `InvoicesListPanel.tsx` - List view panel
- `InvoiceCard.tsx` - Individual invoice display
- `dashboard/tabs/InvoicesTab.tsx` - Tab wrapper

---

## 5. DIVERGENCE ANALYSIS: ADMIN VS HOMEOWNER

### **HomeownerDashboard.tsx Architecture:**
```tsx
// Router component that splits by platform
export const HomeownerDashboard: React.FC<DashboardProps> = (props) => {
  const { isMobileView } = useDashboardInitialization();
  
  if (isMobileView) {
    return <HomeownerMobile {...props} />;
  }
  return <HomeownerDesktop {...props} />;
};
```

### **Key Finding:**
- **Admin** has ONE dashboard: `AdminDashboard.tsx`
- **Homeowner** has TWO platform-specific dashboards:
  - `homeowner/HomeownerDesktop.tsx`
  - `homeowner/HomeownerMobile.tsx`
  
**BUT:** Both HomeownerDesktop and HomeownerMobile share the same hooks:
- `hooks/dashboard/useClaimsData.ts`
- `hooks/dashboard/useTasksData.ts`
- `hooks/dashboard/useMessagesData.ts`

### **Rendering Paths:**

#### **Claims:**
```
App.tsx (ROOT)
  ├─ AdminDashboard.tsx → Sets selectedClaimId
  ├─ HomeownerDesktop.tsx → Sets selectedClaimId
  └─ HomeownerMobile.tsx → Sets selectedClaimId
             ↓
  App.tsx renders <ClaimDetail> (SAME FOR ALL)
```

#### **Tasks:**
```
App.tsx (ROOT)
  └─ <TasksSheet> (GLOBAL, SHARED BY ALL)
       ↑
  useTaskStore().openTasks() from anywhere
```

#### **Chat:**
```
AppShell (GLOBAL)
  └─ <ChatWidget> (Popup, Admin-only)

AdminDashboard
  └─ ChatTab → <TeamChat> (Full-page, Admin-only)
```

---

## 6. MODAL SYSTEM ANALYSIS

### **Current Modal Architecture:**

#### **A. UIContext Modals (AppShell Level)**
Managed by `contexts/UIContext.tsx`:
- ✅ `InvoicesFullView` (Active, Production)
- ✅ `ChatWidget` (Active, Production)

#### **B. Modal Provider System (Placeholder)**
File: `components/providers/modal-provider.tsx`
- Status: **SKELETON ONLY** - Contains placeholder components
- Not currently used in production
- Future enhancement for modal stacking

**Placeholder Modals Found:**
- `InvoiceFormModal` (placeholder)
- `BuilderDetailsModal` (placeholder)
- `HomeownerDetailsModal` (placeholder)
- `ClaimDetailsModal` (placeholder) ⚠️
- `TaskDetailsModal` (placeholder) ⚠️
- `MessageComposeModal` (placeholder)
- `DocumentViewerModal` (placeholder)
- `ImageViewerModal` (placeholder)
- Others...

### **⚠️ CLARIFICATION NEEDED:**
The `modal-provider.tsx` contains a `ClaimDetailsModal` and `TaskDetailsModal`, but these are **placeholder stubs** that just show IDs. They are NOT the actual production components.

**Recommendation:** Rename these placeholders or add comments to prevent confusion:
```tsx
// PLACEHOLDER - NOT IN USE
const ClaimDetailsModal_PLACEHOLDER: React.FC<...> = ...
```

---

## 7. THE "TRUTH MAP" 📍

| Feature | Single Source of Truth | Type | Rendered By | State Management |
|---------|------------------------|------|-------------|------------------|
| **Claims Detail** | `ClaimDetail.tsx` | Full Page | App.tsx | App state (`currentView`, `selectedClaimId`) |
| **New Claim Form** | `NewClaimForm.tsx` | Full Page | App.tsx | App state (`currentView === 'NEW'`) |
| **Tasks** | `TasksSheet.tsx` | Global Drawer | App.tsx (root) | `useTaskStore` (Zustand) |
| **Chat (Popup)** | `ChatWidget.tsx` | Floating FAB | AppShell | `UIContext` |
| **Chat (Full)** | `TeamChat.tsx` | Tab Content | AdminDashboard | URL params (`view=chat`) |
| **SMS Chat** | `SMSChatView.tsx` | Embedded | Messages Tab | Local state |
| **Invoices** | `InvoicesFullView.tsx` | Global Overlay | AppShell | `UIContext` |

### **Core Rendering Components:**
- `ChatWindow.tsx` - Message display (shared by ChatWidget + TeamChat)
- `ChatSidebar.tsx` - Channel list (shared by ChatWidget + TeamChat)

---

## 8. THE "IMPOSTERS LIST" 🔍

### **✅ NO GHOST FILES FOUND**

After thorough analysis, there are **NO redundant competing components** for Claims, Tasks, or Chat.

### **⚠️ Candidates for Cleanup (Low Priority):**

#### **A. Placeholder Modals (Unused)**
File: `components/providers/modal-provider.tsx`
- All modal components are placeholders
- Not wired into production code
- **Action:** Add "PLACEHOLDER" suffix to names or delete file

#### **B. Legacy Documentation References**
Found references to `ClaimModal` and `TaskModal` in old docs:
- `docs/active/SCHEDULE-UNIFIED-EVENTS-JAN-2026.md`
- `docs/archive/UI-POLISH-IMPLEMENTATION-NOTES.md`
- **Action:** Update docs to reference correct component names

#### **C. Commented-Out Code**
Found in dashboards:
```tsx
// AdminDashboard.tsx line 1493-1496
// const [showNewTaskModal, setShowNewTaskModal] = useState(false);
// const [newTaskTitle, setNewTaskTitle] = useState('');
```
- **Action:** Remove commented-out task modal state (now in `useTasksData`)

---

## 9. ARCHITECTURAL PATTERNS (OBSERVED)

### **✅ Good Patterns:**
1. **Lazy Loading:** Heavy components loaded via `React.lazy()`
2. **Global State:** UIContext for persistent modals
3. **URL-based Navigation:** Claims use URL params for deep linking
4. **Shared Hooks:** `useClaimsData`, `useTasksData`, `useMessagesData`
5. **Platform Splitting:** HomeownerMobile vs Desktop prevents conditional hell

### **🎯 Areas for Improvement:**
1. **Modal System:** `modal-provider.tsx` is incomplete - either finish or remove
2. **View State Management:** Mix of URL params and internal state could be unified
3. **Documentation:** Update old references to non-existent modal components

---

## 10. VERIFICATION CHECKLIST

### **Claims:**
- [x] Single ClaimDetail component
- [x] Used by Admin and Homeowner
- [x] No competing claim modals
- [x] Consistent data flow via App.tsx

### **Tasks:**
- [x] Single TasksSheet component
- [x] Global Zustand store
- [x] Rendered once in App.tsx
- [x] No competing task modals

### **Chat:**
- [x] Two intentional systems (Widget + Full Page)
- [x] Share ChatWindow and ChatSidebar
- [x] SMS is separate (different purpose)
- [x] No unintended duplication

### **Invoices:**
- [x] Single InvoicesFullView
- [x] Rendered by AppShell
- [x] UIContext state management
- [x] No wrapper bypassing

---

## 11. RECOMMENDATIONS

### **Immediate Actions (No Code Changes Needed):**
1. ✅ **Confirm:** Your architecture is sound - no ghost files to delete
2. 📝 **Document:** Add this audit to your docs folder
3. 🧹 **Optional Cleanup:** Remove `modal-provider.tsx` placeholders or complete the system

### **Future Enhancements:**
1. **Finish Modal System:** If you want to use `modal-provider.tsx`, wire it up properly
2. **Unify State:** Consider moving more view state to URL params for better back-button support
3. **Remove Comments:** Clean up commented-out modal code in dashboards

---

## 12. CONCLUSION

**Your fears about "Ghost Files" are UNFOUNDED.** 

Your architecture already follows the "Single Source of Truth" principle:
- Claims → `ClaimDetail.tsx`
- Tasks → `TasksSheet.tsx`
- Chat → `ChatWidget.tsx` + `TeamChat.tsx` (intentionally separate)
- Invoices → `InvoicesFullView.tsx`

There are NO competing routers or divergent code paths between Admin and Homeowner views. Both share the same underlying components with role-based prop variations.

The only "imposters" found are placeholder modals in `modal-provider.tsx` that aren't even used in production.

**Status: 🟢 HEALTHY ARCHITECTURE**

---

## APPENDIX: Component Graph

```
App.tsx (ROOT ROUTER)
├─ Layout.tsx
├─ Dashboard.tsx
│  ├─ AdminDashboard.tsx
│  └─ HomeownerDashboard.tsx
│     ├─ HomeownerDesktop.tsx
│     └─ HomeownerMobile.tsx
│
├─ ClaimDetail.tsx ✅ (Shared by Admin + Homeowner)
├─ NewClaimForm.tsx ✅ (Shared by Admin + Homeowner)
├─ TasksSheet.tsx ✅ (Global, Shared by All)
│
└─ AppShell.tsx (Global Overlays)
   ├─ InvoicesFullView.tsx ✅
   └─ ChatWidget.tsx ✅

AdminDashboard Tabs:
├─ ClaimsTab
├─ MessagesTab (SMS)
├─ ChatTab → TeamChat.tsx ✅
├─ InvoicesTab
└─ TasksTab

Shared UI Components:
├─ ChatWindow.tsx (Used by ChatWidget + TeamChat)
├─ ChatSidebar.tsx (Used by ChatWidget + TeamChat)
└─ SMSChatView.tsx (Used by MessagesTab)
```

---

**Audit Completed:** January 25, 2026  
**Audited by:** Cursor AI (Claude Sonnet 4.5)  
**Verdict:** ✅ Architecture is unified and healthy
