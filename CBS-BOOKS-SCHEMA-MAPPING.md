# 📊 CBS BOOKS DATABASE SCHEMA REPORT

**Date:** January 4, 2026  
**Purpose:** Map `backup.json` to database columns for restore operation

---

## ✅ TABLES ALREADY EXIST

CBS Books tables **should** already exist in production. If not, run:
```bash
npm run create-cbsbooks-tables
```

Or check with:
```bash
npx tsx scripts/diagnose-cbsbooks.ts
```

---

## 📋 1. INVOICES TABLE

### **Table Name:** `invoices`

### **Column Definitions (PostgreSQL):**
```sql
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  project_details TEXT,
  payment_link TEXT,
  check_number TEXT,
  date DATE NOT NULL,
  due_date DATE NOT NULL,
  date_paid DATE,
  total DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### **Column Mapping (backup.json → database):**

| **backup.json key** | **Database Column** | **Type** | **Required** | **Notes** |
|---------------------|---------------------|----------|--------------|-----------|
| `id` | `id` | UUID | ✅ | Keep existing UUID |
| `invoiceNumber` | `invoice_number` | TEXT | ✅ | Snake case |
| `clientName` | `client_name` | TEXT | ✅ | Snake case |
| `clientEmail` | `client_email` | TEXT | ❌ | Optional |
| `projectDetails` | `project_details` | TEXT | ❌ | Optional |
| `paymentLink` | `payment_link` | TEXT | ❌ | Optional |
| `checkNumber` | `check_number` | TEXT | ❌ | Optional |
| `date` | `date` | DATE | ✅ | ISO format |
| `dueDate` | `due_date` | DATE | ✅ | Snake case |
| `datePaid` | `date_paid` | DATE | ❌ | If exists in backup |
| `total` | `total` | DECIMAL | ✅ | Numeric |
| `status` | `status` | TEXT | ✅ | Default: 'draft' |
| `items` | `items` | **JSONB** | ✅ | **Store as JSON array** |

---

### **🔑 CRITICAL: `items` Column**

**Database Type:** `JSONB`  
**Storage:** Store the entire `items` array as a JSON blob  
**Example:**
```json
[
  {
    "id": "uuid",
    "description": "Service description",
    "quantity": 1,
    "rate": 100,
    "amount": 100
  }
]
```

**No separate `invoice_items` table** — items are stored inline as JSONB.

---

## 💰 2. EXPENSES TABLE

### **Table Name:** `expenses`

### **Column Definitions (PostgreSQL):**
```sql
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  payee TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### **Column Mapping (backup.json → database):**

| **backup.json key** | **Database Column** | **Type** | **Required** | **Notes** |
|---------------------|---------------------|----------|--------------|-----------|
| `id` | `id` | UUID | ✅ | Keep existing UUID |
| `date` | `date` | DATE | ✅ | ISO format |
| `payee` | `payee` | TEXT | ✅ | Exact match |
| `category` | `category` | TEXT | ✅ | Exact match |
| `amount` | `amount` | DECIMAL | ✅ | Numeric |
| `description` | `description` | TEXT | ❌ | Nullable in backup |

---

## 🏢 3. CLIENTS TABLE

### **Table Name:** `clients`

### **Column Definitions (PostgreSQL):**
```sql
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY,
  company_name TEXT NOT NULL,
  check_payor_name TEXT,
  email TEXT,
  address TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### **Column Mapping (backup.json → database):**

| **backup.json key** | **Database Column** | **Type** | **Required** | **Notes** |
|---------------------|---------------------|----------|--------------|-----------|
| `id` | `id` | UUID | ✅ | Keep existing UUID |
| `companyName` | `company_name` | TEXT | ✅ | Snake case |
| `checkPayorName` | `check_payor_name` | TEXT | ❌ | Snake case |
| `email` | `email` | TEXT | ❌ | Optional |
| `address` | `address` | TEXT | ❌ | All address fields nullable |
| `addressLine1` | `address_line1` | TEXT | ❌ | Snake case |
| `addressLine2` | `address_line2` | TEXT | ❌ | Snake case |
| `city` | `city` | TEXT | ❌ | Optional |
| `state` | `state` | TEXT | ❌ | Optional |
| `zip` | `zip` | TEXT | ❌ | Optional |

---

## 🔧 TYPESCRIPT MAPPING LOGIC

### **Example: Invoice Transformation**
```typescript
// backup.json structure (camelCase)
const backupInvoice = {
  id: "uuid",
  invoiceNumber: "INV-770485",
  clientName: "JK Monarch, LLC",
  clientEmail: "invoices@jkmonarch.com",
  projectDetails: "Q1 2026",
  paymentLink: "https://square.link/...",
  checkNumber: "",
  date: "2025-12-19",
  dueDate: "2026-01-01",
  total: 6600,
  status: "sent",
  items: [{ id: "uuid", description: "Service", ... }]
};

// Database insert (snake_case)
await client.query(`
  INSERT INTO invoices (
    id, invoice_number, client_name, client_email, 
    project_details, payment_link, check_number, 
    date, due_date, total, status, items
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  ON CONFLICT (id) DO NOTHING
`, [
  backupInvoice.id,
  backupInvoice.invoiceNumber,
  backupInvoice.clientName,
  backupInvoice.clientEmail || null,
  backupInvoice.projectDetails || null,
  backupInvoice.paymentLink || null,
  backupInvoice.checkNumber || null,
  backupInvoice.date,
  backupInvoice.dueDate,
  backupInvoice.total,
  backupInvoice.status || 'draft',
  JSON.stringify(backupInvoice.items) // ← JSONB column
]);
```

---

## 🚨 KEY TAKEAWAYS

1. **Snake Case in Database:** All column names use `snake_case`, but backup uses `camelCase`.

2. **JSONB for Items:** The `items` array is stored as a **JSONB column**, not a separate table.

3. **Optional Fields:** Most fields accept `NULL`. Use `|| null` for empty strings.

4. **ON CONFLICT:** Use `ON CONFLICT (id) DO NOTHING` to skip duplicates during restore.

5. **Dates:** All date fields use PostgreSQL `DATE` type (ISO format strings work).

6. **Decimals:** `total` and `amount` use `DECIMAL(10, 2)` for currency.

---

## 📦 SOURCE FILES

- **Schema Definition:** `scripts/create-cbsbooks-tables.ts`
- **Migration Example:** `scripts/migrate-cbsbooks.ts`
- **LocalStorage Migration:** `scripts/migrate-localstorage-invoices.ts`
- **API Routes:** `server/cbsbooks.js`

---

## ✅ NEXT STEPS

1. **Create Restore Script:** `scripts/restore-from-backup.ts`
2. **Read:** `backup.json.json` (parsed data at `.data.invoices`, `.data.expenses`, `.data.clients`)
3. **Transform:** CamelCase → snake_case
4. **Insert:** Using parameterized queries with `ON CONFLICT DO NOTHING`
5. **Report:** Counts of inserted/skipped records

---

**Ready to write the restore script!** 🚀

