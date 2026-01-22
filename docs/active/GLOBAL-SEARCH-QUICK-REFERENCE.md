# Quick Reference: Global Search Implementation

## 🎯 Core Concept

**Tokenized AND Strategy**: Split search query into terms. EVERY term must match SOMEWHERE in the record.

```typescript
// User searches: "FC15 Drywall"
const terms = ["FC15", "Drywall"];

// SQL Logic:
WHERE 
  ("FC15" matches in ANY column)  // ← Must be true
  AND
  ("Drywall" matches in ANY column) // ← Must be true
```

---

## 📁 File Location

**Primary File:** `services/globalSearch.ts`

**Related Files:**
- `types/search.ts` - Type definitions
- `db/schema.ts` - Database schema (homeowners, claims, messageThreads, etc.)

---

## 🔧 How to Modify

### Adding a New Search Field

**Example:** Add `phone` to claims search

```typescript
// In searchClaims function, add to the or() conditions:
const whereConditions = and(
  ...terms.map(term => {
    const searchTerm = `%${term}%`;
    return or(
      // Existing fields...
      ilike(claims.title, searchTerm),
      ilike(claims.description, searchTerm),
      
      // NEW: Add phone search
      ilike(claims.phone, searchTerm),  // ← Add this
      
      // Homeowner fields...
      ilike(homeowners.firstName, searchTerm),
      // ...
    );
  })
);
```

### Adjusting Score Weights

```typescript
// In the scoring section of any search function:
terms.forEach(term => {
  const termLower = term.toLowerCase();
  
  if (claim.title?.toLowerCase().includes(termLower)) {
    score += 15;  // ← Change these numbers
  }
  if (claim.description?.toLowerCase().includes(termLower)) {
    score += 12;  // ← Higher = more important
  }
  // ...
});
```

**Guidelines:**
- Title/Name fields: 15 points
- Important fields (project codes, IDs): 12-13 points  
- Secondary fields (email, description): 10-12 points
- Tertiary fields (address, notes): 8-10 points

---

## 🔍 Search Functions

### 1. `searchHomeowners(query)`
**Searches:** Homeowner records  
**Fields:** firstName, lastName, name, email, phone, address, jobName  
**No joins**

### 2. `searchClaims(query)`
**Searches:** Claims + Homeowner data  
**Fields:** claim (title, description, claimNumber) + homeowner (firstName, lastName, jobName, address)  
**Join:** claims ← homeowners

### 3. `searchAppointments(query)`
**Searches:** Appointments (NOT tokenized)  
**Fields:** title, description  
**No joins**  
**Note:** Uses original simple OR logic

### 4. `searchMessages(query)`
**Searches:** Internal staff chat messages  
**Fields:** content, channelName, senderName, mentions (JSON)  
**Joins:** messages ← channels, users

### 5. `searchHomeownerThreads(query)`
**Searches:** Homeowner message threads  
**Fields:** subject, homeowner (firstName, lastName, jobName, address), messages (JSON)  
**Join:** messageThreads ← homeowners

---

## 🎨 Display Format

### Result Structure
```typescript
{
  type: 'homeowner' | 'claim' | 'event' | 'message',
  id: string,
  title: string,        // Main text
  subtitle: string,     // Context line
  url: string,          // Navigation URL
  icon: string,         // Lucide icon name
  score: number         // 0-100 ranking
}
```

### Subtitle Patterns

**Homeowners:**
```typescript
subtitle: "FC15 • 123 Main St"
// Format: {projectCode} • {address or email}
```

**Claims:**
```typescript
subtitle: "FC15 • #123 • OPEN • Water leak in..."
// Format: {projectCode} • {claimNumber} • {status} • {snippet}
```

**Messages:**
```typescript
subtitle: "DM with John • John Smith"
// Format: {context} • {senderName}
```

**Threads:**
```typescript
subtitle: "FC15 • Kevin Smith"
// Format: {projectCode} • {homeownerName}
```

---

## 🚀 Performance Tips

### 1. Limit Result Count
```typescript
.limit(10)  // Keep this low!
```

### 2. Use Parallel Execution
```typescript
// All searches run simultaneously
const [results1, results2, results3] = await Promise.all([
  searchHomeowners(query),
  searchClaims(query),
  searchMessages(query),
]);
```

### 3. Indexed Columns
Ensure indexes on frequently searched columns:
```sql
CREATE INDEX idx_homeowners_job_name ON homeowners(job_name);
CREATE INDEX idx_claims_title ON claims(title);
CREATE INDEX idx_homeowners_first_name ON homeowners(first_name);
```

### 4. Avoid Searching Large JSON Fields
Searching inside JSON arrays is slow:
```typescript
// This is OK for small datasets:
if (thread.messages && Array.isArray(thread.messages)) {
  for (const msg of thread.messages) {
    if (msg.content?.toLowerCase().includes(termLower)) {
      score += 10;
      break;
    }
  }
}

// For large datasets, consider:
// - Extracting to separate table
// - Using PostgreSQL full-text search
// - Using ElasticSearch
```

---

## 🐛 Common Issues

### Issue: No results for valid search
**Check:**
1. Are both terms matching? (Use console.log to debug)
2. Is the JOIN working? (Check foreign key exists)
3. Case sensitivity? (Use ILIKE not LIKE)

### Issue: Too many results
**Solutions:**
1. Increase minimum score threshold
2. Reduce limit per category
3. Add more specific terms to search

### Issue: Slow performance
**Check:**
1. Database indexes on search columns
2. Result limits (should be ≤10)
3. Number of JSON field searches
4. Query execution time in logs

---

## 📝 Testing

### Manual Test Cases
```typescript
// Test in browser console or API:

// 1. Single term (should work like before)
await performGlobalSearch("FC15");

// 2. Two terms - project + issue
await performGlobalSearch("FC15 Drywall");

// 3. Name + project
await performGlobalSearch("Kevin FC15");

// 4. Multiple terms
await performGlobalSearch("Smith Main Street Water");

// 5. Edge case - special chars
await performGlobalSearch("FC-15");  // May not match "FC15"

// 6. Empty/short query
await performGlobalSearch("");   // Returns empty
await performGlobalSearch("A");  // Returns empty (< 2 chars)
```

### Expected Results
```typescript
{
  results: SearchResult[],  // Sorted by score (high to low)
  total: number,            // Total count
  query: string             // Original query
}
```

---

## 🔐 Security Notes

### SQL Injection Protection
✅ **SAFE:** Using parameterized queries via Drizzle ORM
```typescript
ilike(homeowners.firstName, searchTerm)
// Drizzle handles escaping automatically
```

❌ **UNSAFE:** Raw SQL strings
```typescript
// DON'T DO THIS:
sql`SELECT * FROM homeowners WHERE name LIKE '%${query}%'`
```

### Sensitive Data
- Search results respect database permissions
- No password or sensitive fields in results
- All queries logged for audit

---

## 📊 Monitoring

### Log Points
```typescript
console.log('🔍 [SearchHomeowners] Tokenized search terms:', terms);
console.log('🔍 [SearchClaims] Found', results.length, 'claims');
console.log('🔍 [GlobalSearch] Returning', allResults.length, 'total results');
```

### Metrics to Track
- Average query time per category
- Most common search terms
- Zero-result searches (need better data?)
- Most clicked result types

---

## 🎓 Examples for Developers

### Example 1: Add "Status" to Homeowner Search
```typescript
async function searchHomeowners(query: string) {
  const terms = query.trim().split(/\s+/);
  
  const whereConditions = and(
    ...terms.map(term => {
      const searchTerm = `%${term}%`;
      return or(
        ilike(homeowners.firstName, searchTerm),
        // ... existing fields ...
        ilike(homeowners.status, searchTerm),  // NEW
      );
    })
  );
  
  // In scoring section:
  if (homeowner.status?.toLowerCase().includes(termLower)) {
    score += 8;  // Lower weight than name
  }
}
```

### Example 2: Create New Search Category
```typescript
// 1. Create search function
async function searchContractors(query: string): Promise<SearchResult[]> {
  const terms = query.trim().split(/\s+/);
  
  const whereConditions = and(
    ...terms.map(term => {
      const searchTerm = `%${term}%`;
      return or(
        ilike(contractors.companyName, searchTerm),
        ilike(contractors.specialty, searchTerm),
        ilike(contractors.email, searchTerm)
      );
    })
  );
  
  const results = await db
    .select()
    .from(contractors)
    .where(whereConditions)
    .limit(10);
  
  return results.map(contractor => ({
    type: 'contractor' as const,  // Add to SearchResultType
    id: contractor.id,
    title: contractor.companyName,
    subtitle: contractor.specialty || '',
    url: `#contractors?contractorId=${contractor.id}`,
    icon: 'Briefcase',
    score: 70,  // Calculate based on matches
  }));
}

// 2. Add to performGlobalSearch
const [/* ... */, contractorResults] = await Promise.all([
  searchHomeowners(query),
  searchClaims(query),
  searchContractors(query),  // NEW
  // ...
]);

const allResults = [
  // ...
  ...contractorResults,
];
```

### Example 3: Boost Recent Items
```typescript
// In any search function's scoring section:
if (claim.dateSubmitted) {
  const daysAgo = (Date.now() - new Date(claim.dateSubmitted).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysAgo < 7) {
    score += 10;  // This week
  } else if (daysAgo < 30) {
    score += 5;   // This month
  }
}
score = Math.min(score, 100);  // Always cap!
```

---

## 🔗 Related Documentation

- [Full Technical Documentation](./GLOBAL-SEARCH-UPGRADE-JAN-2026.md)
- [Before/After Comparison](./GLOBAL-SEARCH-BEFORE-AFTER.md)
- Database Schema: `db/schema.ts`
- Search Types: `types/search.ts`

---

**Last Updated:** January 21, 2026  
**Maintained By:** Development Team  
**Questions?** Check the full documentation or ask in #dev-support
