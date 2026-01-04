# 📋 STAGING TABLE: ADDRESS COMPONENT COLUMNS

**Date:** January 4, 2026  
**Model:** Claude Sonnet 4.5

---

## 🎯 GOAL

Expose all parsed address fields in the staging table preview so users can verify parsing accuracy before importing.

---

## ✅ UPDATED TABLE STRUCTURE

### **New Column Layout:**

| # | Name | Email | Phone | **Street** | **City** | **State** | **Zip** | Job Name | Closing Date | Builder |

**Changes:**
- ❌ Removed: "Address" (combined string)
- ✅ Added: "Street" (parsed component)
- ✅ Added: "City" (parsed component)
- ✅ Added: "State" (parsed component, narrow 80px)
- ✅ Added: "Zip" (parsed component, narrow 80px)

---

## 🎨 COLUMN SPECIFICATIONS

### **1. Street Column**

```typescript
<th className="px-4 py-3 font-medium">Street</th>

<td className="px-4 py-3 text-sm">
  {row.street ? (
    <span className="text-surface-on">{row.street}</span>
  ) : (
    <span className="text-surface-on-variant/50">—</span>
  )}
</td>
```

**Features:**
- ✅ Full width (flexible)
- ✅ Shows parsed street address
- ✅ Em dash (—) if empty

**Examples:**
- `123 Main Street`
- `456 Oak Ave Apt 2B`
- `—` (if not parsed)

---

### **2. City Column**

```typescript
<th className="px-4 py-3 font-medium">City</th>

<td className="px-4 py-3 text-sm">
  {row.city ? (
    <span className="text-surface-on">{row.city}</span>
  ) : (
    <span className="text-surface-on-variant/50">—</span>
  )}
</td>
```

**Features:**
- ✅ Full width (flexible)
- ✅ Shows parsed city name
- ✅ Em dash (—) if empty

**Examples:**
- `Seattle`
- `Los Angeles`
- `—` (if not parsed)

---

### **3. State Column** (Narrow)

```typescript
<th className="px-4 py-3 font-medium w-[80px]">State</th>

<td className="px-2 py-3 text-sm w-[80px]">
  {row.state ? (
    <span className="text-surface-on font-medium">{row.state}</span>
  ) : (
    <span className="text-surface-on-variant/50">—</span>
  )}
</td>
```

**Features:**
- ✅ Fixed width: 80px (narrow)
- ✅ Font weight: Medium (stands out)
- ✅ Shows state abbreviation
- ✅ Em dash (—) if empty

**Examples:**
- `WA`
- `CA`
- `NY`
- `—` (if not parsed)

---

### **4. Zip Column** (Narrow)

```typescript
<th className="px-4 py-3 font-medium w-[80px]">Zip</th>

<td className="px-2 py-3 text-sm w-[80px]">
  {row.zip ? (
    <span className="text-surface-on font-mono text-xs">{row.zip}</span>
  ) : (
    <span className="text-surface-on-variant/50">—</span>
  )}
</td>
```

**Features:**
- ✅ Fixed width: 80px (narrow)
- ✅ Font family: Monospace (better readability)
- ✅ Font size: Extra small (fits better)
- ✅ Shows 5-digit ZIP code
- ✅ Em dash (—) if empty

**Examples:**
- `98335` (monospace)
- `90001` (monospace)
- `—` (if not parsed)

---

## 📊 EXAMPLE PREVIEW TABLE

### **Well-Parsed Row:**

| # | Name | Email | Phone | Street | City | State | Zip | Job Name |
|---|------|-------|-------|--------|------|-------|-----|----------|
| 1 | John Smith | john@email.com | 555-1234 | 123 Main St | Seattle | **WA** | `98335` | Oak Hills |

---

### **Partially-Parsed Row:**

| # | Name | Email | Phone | Street | City | State | Zip | Job Name |
|---|------|-------|-------|--------|------|-------|-----|----------|
| 2 | Jane Doe | jane@email.com | 555-5678 | Seattle | — | **WA** | `98335` | Maple Grove |

**Issue:** Street field contains city name (parsing limitation)

---

### **Not-Parsed Row:**

| # | Name | Email | Phone | Street | City | State | Zip | Job Name |
|---|------|-------|-------|--------|------|-------|-----|----------|
| 3 | Bob Builder | bob@email.com | 555-9012 | — | — | — | — | Pine Ridge |

**Issue:** Address field was "Address not provided"

---

## 🎯 VISUAL HIERARCHY

### **Column Widths:**

| Column | Width | Flexibility |
|--------|-------|-------------|
| # | Auto | Fixed (small) |
| Name | Auto | Flexible |
| Email | Auto | Flexible |
| Phone | Auto | Fixed |
| **Street** | Auto | **Flexible** (can grow) |
| **City** | Auto | **Flexible** (can grow) |
| **State** | 80px | **Fixed** (narrow) |
| **Zip** | 80px | **Fixed** (narrow) |
| Job Name | Auto | Flexible |
| Closing Date | Auto | Fixed |
| Builder | Auto | Fixed |

**Priority:**
- Street and City can expand to show full content
- State and Zip are compact (always short)

---

### **Font Styling:**

| Column | Font | Weight | Size | Purpose |
|--------|------|--------|------|---------|
| Street | Default | Regular | SM | Readable |
| City | Default | Regular | SM | Readable |
| **State** | Default | **Medium** | SM | **Emphasis** |
| **Zip** | **Mono** | Regular | **XS** | **Distinction** |

**Rationale:**
- State: Medium weight makes abbreviations stand out
- Zip: Monospace improves number readability

---

## ✅ EMPTY VALUE HANDLING

### **Em Dash (—) for Empty Fields:**

```typescript
{row.street ? (
  <span className="text-surface-on">{row.street}</span>
) : (
  <span className="text-surface-on-variant/50">—</span>
)}
```

**Features:**
- ✅ Uses em dash (—) not hyphen (-)
- ✅ Gray color (50% opacity)
- ✅ Visually distinct from actual data
- ✅ Indicates "no data" vs "empty string"

**Why Not:**
- ❌ "Not parsed" (too verbose, clutters table)
- ❌ Empty cell (looks like bug)
- ❌ "N/A" (too long)

---

## 🔍 VERIFICATION WORKFLOW

### **Before Importing:**

**Step 1:** Upload CSV with addresses

**Step 2:** Review Preview Table

**Check Street Column:**
- ✅ Should show street addresses
- ⚠️ Watch for city names in street field (parsing issue)

**Check City Column:**
- ✅ Should show city names
- ⚠️ Watch for em dashes (—) - parsing failed

**Check State Column:**
- ✅ Should show 2-letter abbreviations (WA, CA, NY)
- ⚠️ Watch for em dashes (—) - parsing failed

**Check Zip Column:**
- ✅ Should show 5-digit codes in monospace
- ⚠️ Watch for em dashes (—) - parsing failed

**Step 3:** Verify Console Logs

```javascript
Row 1 Parsed address: { street: "123 Main St", city: "Seattle", state: "WA", zip: "98335" }
```

**Step 4:** Commit Import

If parsing looks good, click "Commit Import"

---

## 📈 PARSING QUALITY ASSESSMENT

### **Quick Visual Check:**

**Good Parsing (95%+):**
```
| Street             | City      | State | Zip   |
|--------------------|-----------|-------|-------|
| 123 Main St        | Seattle   | WA    | 98335 |
| 456 Oak Ave        | Tacoma    | WA    | 98402 |
| 789 Pine Dr Apt 2B | Bellevue  | WA    | 98004 |
```
✅ All fields populated, makes sense

**Partial Parsing (~50%):**
```
| Street      | City | State | Zip   |
|-------------|------|-------|-------|
| Seattle     | —    | WA    | 98335 |
| Los Angeles | —    | CA    | 90001 |
```
⚠️ Street contains city, City is empty

**Failed Parsing (0%):**
```
| Street | City | State | Zip |
|--------|------|-------|-----|
| —      | —    | —     | —   |
| —      | —    | —     | —   |
```
❌ All em dashes - address was "Address not provided"

---

## 🎨 RESPONSIVE DESIGN

### **Horizontal Scrolling:**

```typescript
<div className="overflow-x-auto max-h-[400px] overflow-y-auto">
  <table className="w-full">
    {/* Table content */}
  </table>
</div>
```

**Features:**
- ✅ Horizontal scroll if table is wide
- ✅ Vertical scroll at 400px height
- ✅ All columns visible (may need to scroll)

**Note:** With 11 columns, horizontal scrolling is expected on smaller screens

---

## 💡 DESIGN DECISIONS

### **Why Remove Combined "Address" Column?**

**Before:**
| Address | City |
|---------|------|
| 123 Main St, Seattle, WA 98335 | Seattle |

**Issues:**
- ❌ Redundant (city shown twice)
- ❌ Takes up space
- ❌ User wants to verify components, not raw string

**After:**
| Street | City | State | Zip |
|--------|------|-------|-----|
| 123 Main St | Seattle | WA | 98335 |

**Benefits:**
- ✅ Shows all parsed components
- ✅ Easy to verify each field
- ✅ Clear what will be stored in DB

---

### **Why Narrow State/Zip Columns?**

**State:**
- Always 2 characters (WA, CA, NY)
- Fixed width 80px is generous
- Medium font weight makes them stand out

**Zip:**
- Always 5 digits
- Monospace font improves readability
- Fixed width 80px fits perfectly

**Result:**
- More space for Street and City (variable length)
- Compact, efficient layout

---

### **Why Em Dash (—) for Empty?**

**Alternatives Considered:**

| Symbol | Issue |
|--------|-------|
| Empty cell | Looks like bug/missing data |
| `null` | Too technical |
| `N/A` | Too verbose |
| `-` | Too small, hard to see |
| `—` | ✅ Clear, visual, standard |

**Em dash is the standard for "no data" in tables**

---

## 📦 FILES MODIFIED

**`components/import/HomeownerImport.tsx`**

**Changes:**
1. Updated table headers:
   - Replaced "Address" with "Street", "City", "State", "Zip"
   - Set State and Zip columns to `w-[80px]`

2. Updated table body:
   - Display `row.street` instead of combined address
   - Display `row.city` with em dash fallback
   - Display `row.state` with medium weight and em dash fallback
   - Display `row.zip` with monospace font and em dash fallback

3. Styling:
   - State: Medium font weight (emphasis)
   - Zip: Monospace font, extra small size
   - Empty values: Gray em dash (—)

---

## 🚀 TESTING CHECKLIST

After deploying:

- [ ] Upload CSV with addresses
- [ ] Preview table shows 11 columns
- [ ] Street column shows street addresses
- [ ] City column shows city names
- [ ] State column shows 2-letter codes (narrow, bold)
- [ ] Zip column shows 5-digit codes (monospace, narrow)
- [ ] Empty fields show em dash (—) in gray
- [ ] Horizontal scroll works if table is wide
- [ ] All columns are legible

---

**Status:** ✅ Staging table now shows all parsed address components for verification!

