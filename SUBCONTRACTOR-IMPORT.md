# 🔧 SUBCONTRACTOR IMPORT - COMPLETE

**Date:** January 4, 2026  
**Model:** Claude Sonnet 4.5

---

## 🎯 GOAL

Implement CSV import for Subcontractors with Company Name, Contact, Email, and Phone fields.

**Constraints:**
- Ignore `specialty` field (set to NULL)
- Upsert logic based on company name
- Optional builder linking via `builder_user_id`

---

## ✅ IMPLEMENTATION

### **1. Schema Updates**

**File:** `db/schema.ts`

**Changes:**

```114:122:db/schema.ts
export const contractors = pgTable('contractors', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name'),
  email: text('email'), // Made optional for import
  phone: text('phone'),
  specialty: text('specialty'), // Made optional - can be null during import
  builderUserId: uuid('builder_user_id').references(() => users.id), // Link to builder
  createdAt: timestamp('created_at').defaultNow(),
});
```

**What Changed:**
- ✅ `email`: Changed from `.notNull()` to optional
- ✅ `specialty`: Changed from `.notNull()` to optional
- ✅ `builderUserId`: Added foreign key to `users` table

**Migration Required:**
```bash
npm run db:push
```

---

### **2. Import Component**

**File:** `components/import/SubImport.tsx`

**Features:**
- CSV upload interface
- Preview table with Company, Contact, Email, Phone
- Validation: Only requires Company Name
- Staging before commit
- Import status display

**CSV Headers Supported:**
- Company Name / Company / company_name
- Contact / Contact Name / contact_name
- Email / email
- Phone / Phone Number / phone

**Preview Table:**
| # | Company | Contact | Email | Phone |
|---|---------|---------|-------|-------|
| 1 | ABC Plumbing | John Smith | john@abc.com | 555-1234 |
| 2 | XYZ Electric | — | — | 555-5678 |

**Validation:**
- ✅ Only Company Name required
- ✅ Contact, Email, Phone optional (shown as —)
- ✅ Skips rows with no company name

---

### **3. Server Action**

**File:** `actions/import-subcontractors.ts`

**Features:**

**Upsert Logic:**
```typescript
// Match existing by company name
const existing = await db.select()
  .from(contractorsTable)
  .where(eq(contractorsTable.companyName, row.companyName));

if (existing) {
  // Update: contact, email, phone
  // LEAVE specialty unchanged
  await db.update(contractorsTable).set({
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    // specialty NOT updated
  });
} else {
  // Insert: with specialty = null
  await db.insert(contractorsTable).values({
    companyName: row.companyName,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    specialty: null, // Ignoring during import
  });
}
```

**Builder Linking (Optional):**
- Can pass `builderUserId` parameter
- Matches on (company name + builder ID) if provided
- Useful for builder-specific subcontractor lists

---

### **4. Dashboard Integration**

**File:** `app/dashboard/admin/import/page.tsx`

**Changes:**
- Added "Subcontractors" tab
- Updated tab type: `'homeowners' | 'builders' | 'subcontractors'`
- Imported and rendered `SubImport` component

**Tab Layout:**
```
┌─────────────┬──────────┬─────────────────┐
│ Homeowners  │ Builders │ Subcontractors  │
└─────────────┴──────────┴─────────────────┘
```

---

## 📊 IMPORT WORKFLOW

### **Step 1: Prepare CSV**

**Required Format:**
```csv
Company Name,Contact,Email,Phone
ABC Plumbing,John Smith,john@abc.com,555-1234
XYZ Electric,,,555-5678
DEF HVAC,Jane Doe,jane@def.com,
```

**Requirements:**
- Company Name: **Required**
- Contact, Email, Phone: Optional

---

### **Step 2: Upload CSV**

1. Navigate to `/dashboard/admin/import`
2. Click "Subcontractors" tab
3. Click "Choose File"
4. Select CSV

---

### **Step 3: Review Preview**

**Console Output:**
```javascript
📊 CSV Parse Complete: 150 total rows
🔑 CSV Headers Found: ['Company Name', 'Contact', 'Email', 'Phone']
Row 1 raw data: { 'Company Name': 'ABC Plumbing', ... }
✅ Parsed 148 valid rows, 2 skipped
```

**Preview Table:**
- All 148 rows displayed
- Company names shown
- Optional fields show "—" if empty
- Verify before importing

---

### **Step 4: Commit Import**

Click "Commit Import" button

**Console Output:**
```javascript
✅ Imported subcontractor: ABC Plumbing
🔄 Updated subcontractor: XYZ Electric (already exists)
✅ Import complete: 100 new, 48 updated
```

**Result:**
```javascript
{
  success: true,
  message: "Import complete: 100 new, 48 updated",
  imported: 100,
  updated: 48,
  errors: []
}
```

---

### **Step 5: Verify Database**

```sql
SELECT company_name, contact_name, email, phone, specialty 
FROM contractors;

-- ABC Plumbing | John Smith | john@abc.com | 555-1234 | NULL
-- XYZ Electric | NULL       | NULL         | 555-5678 | NULL
```

**Note:** `specialty` field is NULL for all imported records

---

## 🎯 KEY FEATURES

### **1. Company Name Only Validation**
- Most permissive validation
- Only requires company name
- All other fields optional

### **2. Smart Upsert**
- Matches existing by company name
- Updates contact info if found
- Preserves existing specialty field
- No duplicate creation

### **3. Specialty Field Handling**
- Set to NULL on insert
- NOT updated on upsert
- Allows manual specialty assignment later
- Doesn't conflict with existing data

### **4. Builder Linking (Optional)**
- Can scope to specific builder
- Useful for multi-tenant scenarios
- Pass `builderUserId` to server action

---

## 📋 CSV EXAMPLES

### **Example 1: Full Data**

```csv
Company Name,Contact,Email,Phone
ABC Plumbing,John Smith,john@abc.com,555-1234
XYZ Electric,Jane Doe,jane@xyz.com,555-5678
DEF HVAC,Bob Builder,bob@def.com,555-9012
```

**Result:** All 3 imported with full data

---

### **Example 2: Minimal Data**

```csv
Company Name,Contact,Email,Phone
ABC Plumbing,,,
XYZ Electric,,,
DEF HVAC,,,
```

**Result:** All 3 imported with company name only

---

### **Example 3: Mixed Data**

```csv
Company Name,Contact,Email,Phone
ABC Plumbing,John Smith,,555-1234
XYZ Electric,,jane@xyz.com,
DEF HVAC,Bob Builder,,
```

**Result:** All 3 imported with partial data

---

### **Example 4: Duplicates (Upsert)**

**First Import:**
```csv
Company Name,Contact,Email,Phone
ABC Plumbing,John Smith,john@abc.com,555-1234
```
**Result:** 1 new record inserted

**Second Import:**
```csv
Company Name,Contact,Email,Phone
ABC Plumbing,John Doe,johndoe@abc.com,555-9999
```
**Result:** Existing record updated (contact/email/phone changed)

---

## ⚠️ SPECIALTY FIELD BEHAVIOR

### **On Insert (New Record):**
```sql
INSERT INTO contractors (company_name, contact_name, email, phone, specialty)
VALUES ('ABC Plumbing', 'John Smith', 'john@abc.com', '555-1234', NULL);
```
**specialty = NULL**

### **On Update (Existing Record):**
```sql
UPDATE contractors 
SET contact_name = 'Jane Doe',
    email = 'jane@abc.com',
    phone = '555-5678'
    -- specialty NOT in SET clause (unchanged)
WHERE company_name = 'ABC Plumbing';
```
**specialty = unchanged (preserves existing value)**

### **Manual Specialty Assignment:**
After import, use UI or SQL to assign:
```sql
UPDATE contractors 
SET specialty = 'Plumbing'
WHERE company_name = 'ABC Plumbing';
```

---

## 🔄 UPSERT SCENARIOS

### **Scenario 1: New Company**
```csv
Company Name,Contact,Email,Phone
New Company,John Smith,john@new.com,555-1234
```
**Result:** INSERT with specialty = NULL

### **Scenario 2: Existing Company (Update Info)**
```csv
Company Name,Contact,Email,Phone
Existing Company,New Contact,new@email.com,555-9999
```
**Result:** UPDATE contact/email/phone, specialty unchanged

### **Scenario 3: Existing Company (Partial Update)**
```csv
Company Name,Contact,Email,Phone
Existing Company,New Contact,,
```
**Result:** UPDATE contact only, email/phone set to NULL, specialty unchanged

---

## 🚨 IMPORTANT NOTES

### **Migration Required:**
After schema changes, run:
```bash
npm run db:push
```

**Changes:**
- `email`: notNull() → optional
- `specialty`: notNull() → optional
- `builderUserId`: added foreign key

### **Idempotent:**
- Safe to run multiple times
- Always matches on company name
- Updates existing, doesn't duplicate

### **Data Preservation:**
- Existing `specialty` values preserved on update
- No data loss risk
- Can re-run import to update contact info

---

## 💡 FUTURE ENHANCEMENTS

### **1. Specialty Import**
```typescript
// Add specialty column to CSV
const specialty = row['Specialty'] || row['Trade'] || null;

// Include in upsert
if (existing) {
  await db.update().set({
    specialty: row.specialty || existing.specialty, // Preserve if not provided
  });
}
```

### **2. Builder Assignment**
```typescript
// UI to assign subcontractor to builder
<SubcontractorBuilderPicker 
  subId={subId}
  currentBuilderId={builderUserId}
  onAssign={(builderId) => assignToBuilder(subId, builderId)}
/>
```

### **3. Duplicate Detection**
```typescript
// Fuzzy matching for similar company names
const similar = await findSimilarCompanyNames(row.companyName);
if (similar.length > 0) {
  warnings.push(`Similar company found: ${similar[0].companyName}`);
}
```

---

## 📦 FILES CREATED/MODIFIED

**Created:**
1. `components/import/SubImport.tsx` - Import UI component
2. `actions/import-subcontractors.ts` - Server action

**Modified:**
1. `db/schema.ts` - Updated contractors table schema
2. `app/dashboard/admin/import/page.tsx` - Added Subcontractors tab

---

## 🎨 UI FEATURES

### **Upload Area:**
- Drag and drop support
- File type validation (.csv)
- Clear upload button

### **Preview Table:**
- 5 columns: #, Company, Contact, Email, Phone
- Em dash (—) for empty fields
- Row hover effects
- Scrollable (max 400px height)

### **Status Display:**
- Import progress indicator
- Success/error messaging
- Detailed error logs (up to 10 shown)
- "Import Another File" button

---

**Status:** ✅ Subcontractor import flow complete and ready to use!

