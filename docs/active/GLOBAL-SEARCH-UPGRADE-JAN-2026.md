# Global Search Upgrade - Cross-Column Tokenized Search
**Date**: January 21, 2026  
**Status**: ✅ Complete

## Overview
Upgraded the Global Search functionality to support "Cross-Column" queries using a **Tokenized AND** strategy. This allows searches like "FC15 Drywall" to successfully find records where "FC15" is in the project code and "Drywall" is in the claim description.

## Problem Statement
Previously, searching for "FC15 Drywall" would fail because no single column contained that exact string. The system used a simple OR strategy where the entire query had to match in at least one column.

## Solution: Tokenized AND Strategy

### Core Algorithm
```typescript
// Split query into terms
const terms = query.trim().split(/\s+/); // ["FC15", "Drywall"]

// Build WHERE clause: EVERY term must match SOMEWHERE
const whereConditions = and(
  ...terms.map(term => 
    or(
      // Each term can match in ANY of these columns
      ilike(column1, `%${term}%`),
      ilike(column2, `%${term}%`),
      // ... more columns
    )
  )
);
```

This generates SQL equivalent to:
```sql
WHERE 
  (column1 ILIKE '%FC15%' OR column2 ILIKE '%FC15%' OR ...)
  AND
  (column1 ILIKE '%Drywall%' OR column2 ILIKE '%Drywall%' OR ...)
```

## Changes by Category

### 1. Homeowners Search (`searchHomeowners`)
**Fields Searched:**
- `firstName`
- `lastName` 
- `name`
- `email`
- `phone`
- `address`
- `jobName` (Project Code like "FC15")

**Example:** Searching "Kevin FC15"
- "Kevin" matches `firstName`
- "FC15" matches `jobName`
- ✅ Result: Finds Kevin's homeowner record

**Scoring:**
- Name match: +15 points
- Project code match: +12 points
- Email match: +10 points
- Address match: +8 points
- Base score: 50, capped at 100

**Display:** Shows project code in subtitle: `FC15 • 123 Main St`

---

### 2. Claims Search (`searchClaims`)
**Join:** Claims ← Homeowners (via `claims.homeownerId`)

**Fields Searched:**
- **Claim:** `title`, `description`, `claimNumber`
- **Homeowner:** `firstName`, `lastName`, `jobName` (project code), `address`

**Example:** Searching "FC15 Leak"
- "FC15" matches `homeowners.jobName`
- "Leak" matches `claims.title`
- ✅ Result: Finds the specific leak claim for project FC15

**Scoring:**
- Title match: +15 points
- Claim number match: +13 points
- Description match: +12 points
- Project code match: +12 points
- Homeowner name match: +10 points
- Address match: +8 points
- Base score: 50, capped at 100

**Display:** Shows project code prominently: `FC15 • #123 • OPEN • Water leak in...`

---

### 3. Internal Messages Search (`searchMessages`)
**Join:** Messages ← Channels, Users

**Fields Searched:**
- `internalMessages.content`
- `internalChannels.name`
- `users.name`
- **Mentions JSON:** Searches `projectName` and `address` in mentions array

**Example:** Searching "FC15 Noise"
- "FC15" matches mentioned homeowner's project code in JSON
- "Noise" matches message content
- ✅ Result: Finds relevant internal chat messages

**Scoring:**
- Message content (start): +15 points
- Message content (contains): +12 points
- Project code in mentions: +12 points
- Channel name match: +10 points
- Sender name match: +8 points
- Recent messages (<7 days): +5 bonus
- Base score: 50, capped at 100

---

### 4. Homeowner Threads Search (`searchHomeownerThreads`) **[NEW]**
**Join:** MessageThreads ← Homeowners

**Fields Searched:**
- `messageThreads.subject`
- `homeowners.firstName`, `lastName`, `jobName`, `address`
- **Messages JSON:** Searches content in messages array

**Example:** Searching "FC15 Drywall"
- "FC15" matches `homeowners.jobName`
- "Drywall" matches message content in JSON array
- ✅ Result: Finds the thread with relevant conversation

**Scoring:**
- Subject match: +15 points
- Project code match: +12 points
- Message content match: +10 points
- Homeowner name match: +10 points
- Address match: +8 points
- Recent threads (<7 days): +5 bonus
- Base score: 50, capped at 100

**Display:** Shows project code: `FC15 • John Smith`

---

## Technical Implementation

### File Modified
- `services/globalSearch.ts` (625 lines)

### Key Changes
1. Added `messageThreads` to imports from schema
2. Implemented tokenization in all search functions (except appointments)
3. Added LEFT JOINs for cross-table searching
4. Implemented weighted scoring system
5. Added new `searchHomeownerThreads` function
6. Updated `performGlobalSearch` to include homeowner threads

### Performance Considerations
- All searches run in parallel using `Promise.all()`
- Each category limited to 10 results
- Uses indexed ILIKE queries (case-insensitive)
- Left joins are efficient with proper foreign key indexes

### SQL Join Performance
All joins use proper foreign key relationships:
```typescript
// Claims → Homeowners
.leftJoin(homeowners, sql`${claims.homeownerId} = ${homeowners.id}`)

// MessageThreads → Homeowners  
.leftJoin(homeowners, sql`${messageThreads.homeownerId} = ${homeowners.id}`)

// Messages → Channels & Users
.leftJoin(internalChannels, sql`${internalMessages.channelId} = ${internalChannels.id}`)
.leftJoin(users, sql`${internalMessages.senderId} = ${users.id}`)
```

## Benefits

### 1. **Smart Contextual Search**
Users can now search using natural language combinations:
- "FC15 Drywall" → Finds drywall claims for project FC15
- "Kevin Leak" → Finds leak claims for homeowner Kevin
- "123 Main Noise" → Finds noise issues at that address

### 2. **Cross-Entity Intelligence**
Search connects related data automatically:
- Project codes (homeowner) with issues (claims/messages)
- Homeowner names with their claims and threads
- Addresses with related appointments and messages

### 3. **Better Ranking**
- Multiple term matches rank higher
- Important fields (project codes, names) weighted more heavily
- Recent items get slight boost
- Scores capped at 100 for consistency

### 4. **Comprehensive Coverage**
Now searches across 5 categories:
1. Homeowners
2. Claims (with homeowner data)
3. Appointments
4. Internal Messages (with mentions)
5. Homeowner Threads (new)

## Testing Recommendations

### Test Cases
```typescript
// Test 1: Project code + issue type
"FC15 Drywall" 
// Should find: Drywall claims for FC15 project

// Test 2: Name + project code
"Kevin FC15"
// Should find: Homeowner Kevin with project FC15

// Test 3: Project code + issue + location
"FC15 Leak Bathroom"
// Should find: Bathroom leak claims for FC15

// Test 4: Multiple terms across different fields
"Smith 123 Main Water"
// Should find: Water issues for Smith at 123 Main St
```

## Notes

### Appointments Not Updated
The `searchAppointments` function was NOT updated to use tokenized search. This was intentional as appointment searches are typically date-based and less likely to benefit from cross-column searching. Can be updated later if needed.

### JSON Field Searching
- **Internal Messages:** Searches mentions JSON for project codes
- **Homeowner Threads:** Searches messages JSON array for content
- For better performance on large datasets, consider migrating to PostgreSQL's full-text search or dedicated search engine (ElasticSearch)

### Future Enhancements
1. Add fuzzy matching for typos (e.g., "FC15" matches "FC-15")
2. Implement search history and suggestions
3. Add filters (date ranges, status, etc.)
4. Consider full-text search indexes for better performance
5. Add search analytics to track popular queries

## Migration Notes
- No database schema changes required
- No breaking changes to API
- Backward compatible with existing search UI
- All existing search queries will work with improved results

---

**Deployed:** Ready for testing  
**Impact:** 🟢 Low Risk - Pure enhancement, no breaking changes  
**Performance:** ⚡ Optimized with parallel queries and indexed searches
