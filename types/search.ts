/**
 * Global Search Types
 * Defines the structure for unified search results across the application
 */

export type SearchResultType = 'homeowner' | 'claim' | 'event' | 'message';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string; // Main text to display
  subtitle: string; // Context (e.g., "123 Main St" or "Sent by Bob")
  url: string; // Where to go when clicked
  icon: string; // Lucide icon name
  score: number; // Relevance score (0-100)
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

