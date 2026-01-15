# Per-Builder Enrollment System - Implementation Progress

## Status: 🚧 In Progress (60% Complete)

Refactoring the Homeowner Enrollment workflow to use per-builder public URLs instead of a generic form.

---

## ✅ Completed Tasks

### 1. UI Cleanup - Header Buttons Removed
**File**: `components/Layout.tsx`

**Changes**:
- ❌ Removed "Enroll Homeowner" button from admin menu
- ❌ Removed "Switch to Homeowner View" / "Switch to Admin View" button
- ✅ These are now replaced by per-builder enrollment URLs and the "View As" button

### 2. Homeowner Card - Action Buttons Added
**File**: `components/ui/HomeownerCard.tsx`

**Changes**:
- ✅ Added `onViewAs` prop to interface
- ✅ Added bottom-right action buttons container
- ✅ **View As** button: Circular ghost button with Eye icon (blue accent)
- ✅ **Edit** button: Circular ghost button with Edit2 icon (gray)
- ✅ Adjusted card padding (`pb-16`) to accommodate buttons

**Usage**:
```tsx
<HomeownerCard
  {...homeowner}
  onEdit={() => openEditModal()}
  onViewAs={() => switchToHomeownerView()}  // NEW
/>
```

### 3. Database Schema - enrollment_slug Column Added
**File**: `db/schema.ts`

**Changes**:
```typescript
export const builderGroups = pgTable('builder_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  enrollmentSlug: text('enrollment_slug').unique(), // ✅ NEW
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Migration Scripts Created**:

#### a. SQL Migration: `drizzle/add-enrollment-slug.sql`
- ✅ Adds `enrollment_slug` column (nullable initially)
- ✅ Backfills existing builders with kebab-case slugs
- ✅ Handles duplicates by appending numbers
- ✅ Adds unique constraint
- ✅ Verification query included

#### b. TypeScript Backfill Script: `scripts/backfill-enrollment-slugs.ts`
- ✅ Reads builders without slugs
- ✅ Generates URL-safe slugs from names
- ✅ Ensures uniqueness
- ✅ Displays sample enrollment URLs

**Run Commands**:
```bash
# Option 1: SQL migration
psql $DATABASE_URL -f drizzle/add-enrollment-slug.sql

# Option 2: TypeScript script
npx tsx scripts/backfill-enrollment-slugs.ts
```

---

## 🚧 In Progress Tasks

### 4. Refactor EnrollmentForm Component
**File**: `components/HomeownerEnrollment.tsx`

**Required Changes**:
1. Add `forcedBuilderId?: string` prop to interface
2. Add builder selection dropdown for admin use (when forcedBuilderId not provided)
3. Hide builder dropdown when forcedBuilderId is provided
4. Update form submission to use forcedBuilderId

**Current Issue**: 
- Form hardcodes `builder: 'Pending Assignment'` (line 254)
- No builder selection dropdown currently exists

**Implementation Plan**:
```typescript
interface HomeownerEnrollmentProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (data: Partial<Homeowner>, tradeListFile: File | null, subcontractorList?: any[]) => void;
  builderGroups: BuilderGroup[];
  forcedBuilderId?: string;  // NEW - When provided, builder is pre-assigned
}

// In form submission:
const builderData = forcedBuilderId 
  ? builderGroups.find(b => b.id === forcedBuilderId)
  : selectedBuilderFromDropdown;
```

---

## ⏳ Pending Tasks

### 5. Create Public Route: `/enroll/[slug]/page.tsx`

**Location**: `enroll/[slug]/page.tsx` (at root, NOT in app/)

**Structure**:
```
/enroll/
├── [slug]/
│   ├── page.tsx           // Dynamic route page
│   └── layout.tsx         // Minimal public layout (no sidebar/nav)
```

**Page Logic**:
1. Extract slug from URL params
2. Fetch builder by enrollment_slug
3. Return 404 if not found
4. Render `<HomeownerEnrollment forcedBuilderId={builder.id} />`

**Key Requirements**:
- ✅ Must be truly public (no auth)
- ✅ Must use simple layout (no dashboard UI)
- ✅ Must handle 404 gracefully

### 6. Update Middleware/Routing

**Challenge**: This is a Vite/React app (not Next.js)

**Required**:
- Check if Clerk middleware exists
- Add `/enroll/*` to public routes
- Ensure no authentication redirect for enrollment URLs

**Possible Locations**:
- Root-level routing configuration
- Clerk provider configuration
- Vite routing setup

### 7. Builder Settings - Enrollment Link Management

**Location**: Add to Builder Detail View (Right Pane of Builders Tab)

**UI Components Needed**:

#### a. "Enrollment Link" Button
- Location: Builder detail/edit form
- Action: Opens dialog with public URL

#### b. Enrollment Dialog
**Content**:
```
Title: "Public Enrollment Link"
Subtitle: "Share this link with homebuyers"

URL Display: https://[domain]/enroll/[slug]
            [Copy Link Button]

Slug Management:
Current Slug: [slug-here]
              [Generate New Slug Button]

Actions: [Close]
```

**Features**:
- Copy to clipboard
- Generate new slug (with confirmation)
- Show QR code (optional)

**File to Modify**:
- `lib/cbsbooks/components/Clients.tsx` (Builder list/detail)
- OR: `lib/cbsbooks/components/BuilderForm.tsx` (if form exists)

---

## Architecture Decisions

### Why Root-Level Route?

**Problem**: Auth middleware in `/app` directory blocks unauthenticated access.

**Solution**: Place public enrollment route at root level:
```
project-root/
├── app/                    # Authenticated dashboard
├── enroll/                 # ✅ Public enrollment (no auth)
│   └── [slug]/
│       ├── layout.tsx     # Minimal layout
│       └── page.tsx       # Public form
```

### Builder Assignment Flow

**Old (Generic)**:
1. Admin opens enrollment form
2. Admin manually assigns builder
3. Homeowner receives generic invite

**New (Per-Builder)**:
1. Builder gets unique URL: `/enroll/cascade-builders`
2. Builder shares URL with homebuyers
3. Homebuyer fills form (builder auto-assigned)
4. Admin reviews enrollment

---

## Testing Checklist

### Database Migration
- [ ] Run SQL migration successfully
- [ ] Verify all builders have unique enrollment_slug
- [ ] Check for no null slugs
- [ ] Test slug generation with special characters
- [ ] Test duplicate slug handling

### UI Changes
- [ ] Header no longer shows "Enroll Homeowner"
- [ ] Header no longer shows "Switch to Homeowner"
- [ ] Homeowner Card shows Edit button (bottom-right)
- [ ] Homeowner Card shows View As button (blue, Eye icon)
- [ ] Both buttons are clickable and positioned correctly

### Enrollment Form
- [ ] Admin use: Shows builder selection dropdown
- [ ] Public use: Hides builder selection
- [ ] Public use: Builder auto-assigned correctly
- [ ] Form validation works with forcedBuilderId
- [ ] Submission includes correct builder data

### Public Route
- [ ] `/enroll/[valid-slug]` loads form
- [ ] `/enroll/invalid-slug` shows 404
- [ ] No authentication required
- [ ] Form submits successfully
- [ ] Builder is correctly assigned

### Builder Settings
- [ ] "Enrollment Link" button visible in builder detail
- [ ] Dialog shows correct URL
- [ ] Copy to clipboard works
- [ ] Generate new slug works
- [ ] Slug regeneration updates database

---

## Next Steps (Priority Order)

1. **Complete EnrollmentForm Refactor** (Task 4)
   - Add forcedBuilderId prop
   - Add builder dropdown for admin
   - Hide dropdown when forced

2. **Create Public Route** (Task 5)
   - Set up `/enroll/[slug]/` structure
   - Create minimal public layout
   - Implement page logic

3. **Configure Routing/Middleware** (Task 6)
   - Identify auth configuration
   - Add public route exception

4. **Add Builder Settings UI** (Task 7)
   - Enrollment link button
   - Dialog with copy functionality
   - Slug regeneration

---

## Files Modified

- ✅ `components/Layout.tsx` - Removed header buttons
- ✅ `components/ui/HomeownerCard.tsx` - Added action buttons
- ✅ `db/schema.ts` - Added enrollment_slug column
- ⏳ `components/HomeownerEnrollment.tsx` - Needs forcedBuilderId logic
- 📝 `drizzle/add-enrollment-slug.sql` - New migration
- 📝 `scripts/backfill-enrollment-slugs.ts` - New backfill script

## Files To Create

- ⏳ `enroll/[slug]/page.tsx` - Public enrollment page
- ⏳ `enroll/[slug]/layout.tsx` - Minimal public layout
- ⏳ Builder settings dialog component

---

## Commit Strategy

**Completed Work (Ready to Commit)**:
```bash
git add components/Layout.tsx components/ui/HomeownerCard.tsx db/schema.ts drizzle/add-enrollment-slug.sql scripts/backfill-enrollment-slugs.ts
git commit -m "feat: per-builder enrollment system - phase 1 (UI + DB schema)"
```

**Remaining Work (Separate Commits)**:
- Phase 2: Enrollment form refactor
- Phase 3: Public route implementation
- Phase 4: Builder settings UI

---

## Success Criteria

✅ **Phase 1 Complete**: UI cleaned up, database ready
🚧 **Phase 2 Pending**: Form supports both admin and public use
⏳ **Phase 3 Pending**: Public URLs functional
⏳ **Phase 4 Pending**: Builder management UI complete

**Final Goal**: Builders can share unique enrollment URLs with homebuyers, eliminating manual admin enrollment.
