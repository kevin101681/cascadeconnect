/**
 * Global Search Service
 * Provides unified search across homeowners, claims, appointments, and messages
 * 🔐 SECURITY: Now uses server-side API instead of direct DB access
 */

import type { SearchResult, SearchResponse } from '../types/search';

/**
 * Perform global search across all entities
 * @param query - Search query string
 * @returns Unified search results sorted by relevance
 */
export async function performGlobalSearch(query: string): Promise<SearchResponse> {
  console.log('🔍 [GlobalSearch] performGlobalSearch called with query:', query);
  
  if (!query || query.trim().length < 2) {
    console.log('🔍 [GlobalSearch] Query too short, returning empty results');
    return {
      results: [],
      total: 0,
      query: query.trim(),
    };
  }

  const trimmedQuery = query.trim();
  console.log('🔍 [GlobalSearch] Calling server API for:', trimmedQuery);

  try {
    // 🔐 SECURITY FIX: Call server API instead of direct DB access
    const response = await fetch(`/.netlify/functions/admin-search?query=${encodeURIComponent(trimmedQuery)}`);
    
    if (!response.ok) {
      console.error('🔍 [GlobalSearch] API error:', response.status);
      return {
        results: [],
        total: 0,
        query: trimmedQuery,
      };
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error('🔍 [GlobalSearch] Search failed:', data.error);
      return {
        results: [],
        total: 0,
        query: trimmedQuery,
      };
    }

    console.log('🔍 [GlobalSearch] Returning', data.results.length, 'total results');
    return {
      results: data.results || [],
      total: data.total || 0,
      query: trimmedQuery,
    };
  } catch (error) {
    console.error('🔍 [GlobalSearch] Error during search:', error);
    return {
      results: [],
      total: 0,
      query: trimmedQuery,
    };
  }
}

