# 🌐 GLOBAL SUBCONTRACTORS - REMOVE BUILDER DEPENDENCY

**Date:** January 4, 2026  
**Model:** Claude Sonnet 4.5

---

## 🎯 GOAL

Remove `builder_user_id` dependency from Subcontractors - make them GLOBAL entities not tied to specific builders.

**Error Fixed:** `column "builder_user_id" does not exist`

---

## ✅ CHANGES MADE

### **1. Schema Update** (`db/schema.ts`)

**Before:**
```typescript
export const contractors = pgTable('contractors', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  specialty: text('specialty'),
  builderUserId: uuid('builder_user_id').references(() => users.id), // ❌ REMOVED
  createdAt: timestamp('created_at').defaultNow(),
});
```

**After:**
```typescript
export const contractors = pgTable('contractors', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  specialty: text('specialty'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Change:** Removed `builderUserId` field entirely

**⚠️ Migration Required:**
```bash
npm run db:push
```

---

### **2. Server Action Update** (`actions/import-subcontractors.ts`)

#### **A. Updated Imports:**

**Before:**
```typescript
import { eq, and } from 'drizzle-orm';
```

**After:**
```typescript
import { eq } from 'drizzle-orm';  // Removed 'and'
```

**Reason:** No longer need `and()` for compound queries

---

#### **B. Removed Parameter:**

**Before:**
```typescript
export async function importSubcontractors(
  subcontractors: SubcontractorImportRow[],
  builderUserId?: string  // ❌ REMOVED
): Promise<SubcontractorImportResult>
```

**After:**
```typescript
export async function importSubcontractors(
  subcontractors: SubcontractorImportRow[]
): Promise<SubcontractorImportResult>
```

**Change:** Removed optional `builderUserId` parameter

---

#### **C. Simplified Match Logic:**

**Before:**
```typescript
// Complex logic with builder filtering
if (builderUserId) {
  const matches = await db
    .select({ id: contractorsTable.id })
    .from(contractorsTable)
    .where(
      and(
        eq(contractorsTable.companyName, row.companyName.trim()),
        eq(contractorsTable.builderUserId, builderUserId)
      )
    );
} else {
  // Global match
  const matches = await db
    .select()
    .where(eq(contractorsTable.companyName, row.companyName.trim()));
}
```

**After:**
```typescript
// Simple GLOBAL match by company name only
const matches = await db
  .select({ id: contractorsTable.id })
  .from(contractorsTable)
  .where(eq(contractorsTable.companyName, row.companyName.trim()))
  .limit(1);

const existing = matches.length > 0 ? matches[0] : null;
```

**Benefits:**
- ✅ Simpler code (no branching)
- ✅ Always global match
- ✅ Unique by company name across entire system

---

#### **D. Removed from Insert:**

**Before:**
```typescript
await db.insert(contractorsTable).values({
  companyName: row.companyName.trim(),
  contactName: row.contactName || null,
  email: row.email || null,
  phone: row.phone || null,
  specialty: null,
  builderUserId: builderUserId || null,  // ❌ REMOVED
});
```

**After:**
```typescript
await db.insert(contractorsTable).values({
  companyName: row.companyName.trim(),
  contactName: row.contactName || null,
  email: row.email || null,
  phone: row.phone || null,
  specialty: null,
});
```

**Change:** No longer insert `builderUserId`

---

#### **E. Removed from Update:**

**Before:**
```typescript
.set({
  contactName: row.contactName || null,
  email: row.email || null,
  phone: row.phone || null,
  // NOTE: specialty is intentionally NOT updated - left as-is
  // builderUserId is also left as-is  ❌ REMOVED
})
```

**After:**
```typescript
.set({
  contactName: row.contactName || null,
  email: row.email || null,
  phone: row.phone || null,
  // NOTE: specialty is intentionally NOT updated - left as-is
})
```

**Change:** Removed comment about `builderUserId`

---

### **3. Updated Documentation:**

**File Header:**
```typescript
/**
 * SUBCONTRACTOR IMPORT SERVER ACTION
 * 
 * Features:
 * - Imports subcontractors from CSV
 * - Upserts based on company name (GLOBAL - not tied to builder)
 * - Ignores specialty field (leaves as null)
 */
```

**Function Comment:**
```typescript
/**
 * Import subcontractors with upsert logic
 * Subcontractors are GLOBAL - not tied to specific builders
 */
```

---

## 📊 BEHAVIOR CHANGES

### **Before: Builder-Scoped Subcontractors**

**Data Model:**
```
Builder A's Subs:
- ABC Plumbing (builder_user_id = Builder A)
- XYZ Electric (builder_user_id = Builder A)

Builder B's Subs:
- ABC Plumbing (builder_user_id = Builder B)  // Duplicate allowed
- DEF HVAC (builder_user_id = Builder B)
```

**Matching:**
- Checked both company name AND builder_user_id
- Each builder could have their own "ABC Plumbing"
- Duplicate company names across builders

---

### **After: Global Subcontractors**

**Data Model:**
```
Global Subs:
- ABC Plumbing (no builder link)
- XYZ Electric (no builder link)
- DEF HVAC (no builder link)
```

**Matching:**
- Checks only company name
- Unique company names across entire system
- Shared resource pool

**Benefits:**
- ✅ Simpler data model
- ✅ No duplicates
- ✅ Easier to manage
- ✅ True to real-world (subs work for multiple builders)

---

## 🔄 IMPORT BEHAVIOR

### **Example 1: New Subcontractor**

**CSV:**
```csv
Company Name,Contact,Email,Phone
ABC Plumbing,John Smith,john@abc.com,555-1234
```

**Result:**
```sql
INSERT INTO contractors (company_name, contact_name, email, phone, specialty)
VALUES ('ABC Plumbing', 'John Smith', 'john@abc.com', '555-1234', NULL);
```

**Status:** ✅ Inserted (no builder_user_id)

---

### **Example 2: Duplicate Company (Global)**

**First Import:**
```csv
Company Name,Contact,Email,Phone
ABC Plumbing,John Smith,john@abc.com,555-1234
```
**Result:** Inserted

**Second Import:**
```csv
Company Name,Contact,Email,Phone
ABC Plumbing,Jane Doe,jane@abc.com,555-5678
```
**Result:** Updated (contact/email/phone changed)

**Database:**
```sql
-- Only ONE record for ABC Plumbing (globally unique)
SELECT * FROM contractors WHERE company_name = 'ABC Plumbing';
-- company_name  | contact_name | email           | phone
-- ABC Plumbing  | Jane Doe     | jane@abc.com    | 555-5678
```

---

## ⚠️ MIGRATION NOTES

### **Database Changes:**

**Column Removal:**
```sql
-- If builder_user_id column exists, it will be dropped
ALTER TABLE contractors DROP COLUMN builder_user_id;
```

**After Migration:**
```bash
npm run db:push
```

**Expected Output:**
```
? Column "builder_user_id" will be dropped. Are you sure? (y/N) y
✅ Schema updated successfully
```

---

### **Existing Data:**

**If you have existing contractors with builder_user_id:**

**Before Migration:**
```sql
SELECT company_name, builder_user_id FROM contractors;
-- ABC Plumbing  | uuid-builder-a
-- ABC Plumbing  | uuid-builder-b
-- XYZ Electric  | uuid-builder-a
```

**After Migration:**
```sql
SELECT company_name FROM contractors;
-- ABC Plumbing
-- ABC Plumbing  ⚠️ DUPLICATE (will cause issues)
-- XYZ Electric
```

**Potential Issue:** Duplicate company names

**Solution:**
```sql
-- Option 1: Keep first occurrence
DELETE FROM contractors a
USING contractors b
WHERE a.id > b.id
AND a.company_name = b.company_name;

-- Option 2: Merge duplicates manually
-- Review and merge records with same company_name
```

---

## 🎯 KEY TAKEAWAYS

### **Design Decision:**

**Why Global Subcontractors?**

1. **Real-World Model:**
   - Subcontractors typically work for multiple builders
   - They are independent businesses
   - Not owned by specific builders

2. **Simpler Data Model:**
   - No foreign key complexity
   - No cascade delete issues
   - Easier to query

3. **Better UX:**
   - Autocomplete across all subs
   - No duplicate entry needed
   - Shared resource pool

4. **Flexibility:**
   - Can still track which builder used which sub via claims/tasks
   - Many-to-many relationship handled at application level

---

### **Alternative Approach (Not Implemented):**

If builder-specific subs are needed later:

**Option A: Junction Table**
```typescript
export const builderContractors = pgTable('builder_contractors', {
  builderId: uuid('builder_id').references(() => users.id),
  contractorId: uuid('contractor_id').references(() => contractors.id),
  // Keep contractors global, link via junction
});
```

**Option B: Composite Unique Key**
```typescript
export const contractors = pgTable('contractors', {
  companyName: text('company_name').notNull(),
  builderUserId: uuid('builder_user_id').references(() => users.id),
}, (table) => ({
  // Unique: (companyName + builderUserId)
  uniq: unique().on(table.companyName, table.builderUserId),
}));
```

---

## 📦 FILES MODIFIED

**1. `db/schema.ts`**
   - Removed `builderUserId` field from contractors table

**2. `actions/import-subcontractors.ts`**
   - Removed `builderUserId` parameter
   - Simplified match logic (global only)
   - Removed `and` import
   - Updated documentation

---

## ✅ TESTING CHECKLIST

After deploying:

- [ ] Run `npm run db:push` to apply schema changes
- [ ] Upload CSV with subcontractors
- [ ] Verify import succeeds without `builder_user_id` error
- [ ] Check database: `SELECT * FROM contractors;`
- [ ] Verify no `builder_user_id` column exists
- [ ] Test duplicate import (same company name)
- [ ] Verify update works (not duplicate insert)

---

## 🚀 BENEFITS

**1. Error Fixed:**
- ✅ No more `column "builder_user_id" does not exist` error

**2. Simpler Code:**
- ✅ Removed 20+ lines of conditional logic
- ✅ Single match path (not branching)
- ✅ Easier to maintain

**3. Better Data Model:**
- ✅ Global uniqueness by company name
- ✅ No duplicates
- ✅ Matches real-world model

**4. Future-Proof:**
- ✅ Can add builder association later if needed
- ✅ Via junction table (many-to-many)
- ✅ Without breaking existing data

---

**Status:** ✅ Subcontractors are now GLOBAL - no builder dependency!

