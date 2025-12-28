/**
 * HOMEOWNER MATCHING SERVICE
 * Fuzzy address matching and homeowner lookup functionality
 * Follows .cursorrules: Type safety, error handling, best practices
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface MatchResult {
  homeowner: any;
  similarity: number;
}

export interface MatchOptions {
  minSimilarity?: number;
  ignoreCase?: boolean;
}

// ==========================================
// CONFIGURATION
// ==========================================

const DEFAULT_MIN_SIMILARITY = 0.4; // 40% similarity threshold

// ==========================================
// STRING NORMALIZATION
// ==========================================

/**
 * Normalize address for comparison
 * Handles common abbreviations and formatting differences
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[.,#]/g, '') // Remove punctuation
    // Common street type abbreviations
    .replace(/\bstreet\b/gi, 'st')
    .replace(/\bavenue\b/gi, 'ave')
    .replace(/\broad\b/gi, 'rd')
    .replace(/\bdrive\b/gi, 'dr')
    .replace(/\bcourt\b/gi, 'ct')
    .replace(/\blane\b/gi, 'ln')
    .replace(/\bboulevard\b/gi, 'blvd')
    .replace(/\bway\b/gi, 'wy')
    .replace(/\bcircle\b/gi, 'cir')
    .replace(/\bplace\b/gi, 'pl')
    // Directional abbreviations
    .replace(/\bnorth\b/gi, 'n')
    .replace(/\bsouth\b/gi, 's')
    .replace(/\beast\b/gi, 'e')
    .replace(/\bwest\b/gi, 'w')
    .replace(/\bnortheast\b/gi, 'ne')
    .replace(/\bnorthwest\b/gi, 'nw')
    .replace(/\bsoutheast\b/gi, 'se')
    .replace(/\bsouthwest\b/gi, 'sw');
}

// ==========================================
// SIMILARITY ALGORITHMS
// ==========================================

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits (insertions, deletions, substitutions)
 * required to change one string into the other
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  // Initialize first column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        // Characters match, no operation needed
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        // Characters don't match, take minimum of three operations
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity between two strings (0.0 to 1.0)
 * Uses Levenshtein distance and normalizes by the length of the longer string
 * 
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns Similarity score between 0.0 (completely different) and 1.0 (identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeAddress(str1);
  const s2 = normalizeAddress(str2);
  
  // Handle edge cases
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Calculate distance and normalize
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  
  return 1 - (distance / maxLen);
}

/**
 * Calculate Jaro-Winkler similarity (alternative algorithm)
 * Better for short strings with transposition errors
 */
function jaroSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  return ((matches / len1) + (matches / len2) + ((matches - transpositions / 2) / matches)) / 3.0;
}

// ==========================================
// HOMEOWNER MATCHING
// ==========================================

/**
 * Find matching homeowner by address using fuzzy matching
 * 
 * @param db - Drizzle database instance
 * @param address - Address to search for
 * @param options - Matching options (minSimilarity threshold)
 * @returns Best matching homeowner and similarity score, or null if no match
 */
export async function findMatchingHomeowner(
  db: any,
  address: string,
  options: MatchOptions = {}
): Promise<MatchResult | null> {
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  
  console.log(`🔍 Fuzzy matching address: "${address}" (min similarity: ${minSimilarity})`);
  
  // Validate input
  if (!address || address.trim().length === 0) {
    console.log('⚠️ Empty address provided');
    return null;
  }
  
  try {
    // Import schema dynamically to avoid circular dependencies
    const { homeowners } = await import('../../db/schema');
    
    // Get all homeowners from database
    const allHomeowners = await db.select().from(homeowners);
    
    console.log(`📊 Comparing against ${allHomeowners.length} homeowners in database`);
    
    let bestMatch: MatchResult | null = null;
    
    // Compare with each homeowner's address
    for (const homeowner of allHomeowners) {
      const homeownerAddress = homeowner.address || '';
      
      // Skip if homeowner has no address
      if (!homeownerAddress.trim()) {
        continue;
      }
      
      // Calculate similarity
      const similarity = calculateSimilarity(address, homeownerAddress);
      
      // Debug log for close matches
      if (similarity >= 0.3) {
        console.log(`  📏 ${homeowner.name}: ${Math.round(similarity * 100)}% similar`);
        console.log(`     Input: "${address}"`);
        console.log(`     DB:    "${homeownerAddress}"`);
      }
      
      // Update best match if this is better
      if (similarity >= minSimilarity) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { homeowner, similarity };
        }
      }
    }
    
    if (bestMatch) {
      console.log(`✅ Best match: ${bestMatch.homeowner.name} (${Math.round(bestMatch.similarity * 100)}% similar)`);
    } else {
      console.log(`⚠️ No match found above ${Math.round(minSimilarity * 100)}% threshold`);
    }
    
    return bestMatch;
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error finding matching homeowner:', errorMessage);
    throw new Error(`Failed to match homeowner: ${errorMessage}`);
  }
}

/**
 * Find multiple potential matches for an address
 * Returns top N matches above the threshold
 */
export async function findMultipleMatches(
  db: any,
  address: string,
  options: MatchOptions & { limit?: number } = {}
): Promise<MatchResult[]> {
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const limit = options.limit ?? 5;
  
  console.log(`🔍 Finding multiple matches for: "${address}"`);
  
  if (!address || address.trim().length === 0) {
    return [];
  }
  
  try {
    const { homeowners } = await import('../../db/schema');
    const allHomeowners = await db.select().from(homeowners);
    
    // Calculate similarity for all homeowners
    const matches: MatchResult[] = [];
    
    for (const homeowner of allHomeowners) {
      const homeownerAddress = homeowner.address || '';
      if (!homeownerAddress.trim()) continue;
      
      const similarity = calculateSimilarity(address, homeownerAddress);
      
      if (similarity >= minSimilarity) {
        matches.push({ homeowner, similarity });
      }
    }
    
    // Sort by similarity (highest first) and limit results
    matches.sort((a, b) => b.similarity - a.similarity);
    const topMatches = matches.slice(0, limit);
    
    console.log(`✅ Found ${topMatches.length} matches above ${Math.round(minSimilarity * 100)}% threshold`);
    
    return topMatches;
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error finding multiple matches:', errorMessage);
    return [];
  }
}

/**
 * Check if two addresses are likely the same
 * Uses a higher similarity threshold for direct comparison
 */
export function areAddressesSimilar(address1: string, address2: string, threshold: number = 0.85): boolean {
  const similarity = calculateSimilarity(address1, address2);
  return similarity >= threshold;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Extract street number from address
 */
export function extractStreetNumber(address: string): string | null {
  const match = address.match(/^\d+/);
  return match ? match[0] : null;
}

/**
 * Extract street name from address
 */
export function extractStreetName(address: string): string | null {
  // Remove street number and normalize
  const normalized = normalizeAddress(address);
  const withoutNumber = normalized.replace(/^\d+\s*/, '');
  return withoutNumber.trim() || null;
}

/**
 * Get match quality description
 */
export function getMatchQualityDescription(similarity: number): string {
  if (similarity >= 0.95) return 'Excellent match';
  if (similarity >= 0.85) return 'Very good match';
  if (similarity >= 0.70) return 'Good match';
  if (similarity >= 0.50) return 'Fair match';
  return 'Weak match';
}

