/**
 * UNIT TESTS FOR HOMEOWNER MATCHING SERVICE
 * Tests address normalization, similarity calculations, and matching logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeAddress,
  calculateSimilarity,
  levenshteinDistance,
  findMatchingHomeowner,
  findMultipleMatches,
  areAddressesSimilar,
  extractStreetNumber,
  extractStreetName,
  getMatchQualityDescription,
} from '../homeownerMatchingService';

describe('homeownerMatchingService', () => {
  describe('normalizeAddress', () => {
    it('should convert to lowercase', () => {
      expect(normalizeAddress('123 MAIN STREET')).toBe('123 main st');
    });

    it('should trim whitespace', () => {
      expect(normalizeAddress('  123 Main St  ')).toBe('123 main st');
    });

    it('should normalize multiple spaces', () => {
      expect(normalizeAddress('123    Main    St')).toBe('123 main st');
    });

    it('should remove punctuation', () => {
      expect(normalizeAddress('123, Main St.')).toBe('123 main st');
      expect(normalizeAddress('123 Main St #5')).toBe('123 main st 5');
    });

    it('should normalize street types', () => {
      expect(normalizeAddress('123 Main Street')).toBe('123 main st');
      expect(normalizeAddress('123 Main Avenue')).toBe('123 main ave');
      expect(normalizeAddress('123 Main Road')).toBe('123 main rd');
      expect(normalizeAddress('123 Main Drive')).toBe('123 main dr');
      expect(normalizeAddress('123 Main Court')).toBe('123 main ct');
      expect(normalizeAddress('123 Main Lane')).toBe('123 main ln');
      expect(normalizeAddress('123 Main Boulevard')).toBe('123 main blvd');
    });

    it('should normalize directional abbreviations', () => {
      expect(normalizeAddress('123 North Main St')).toBe('123 n main st');
      expect(normalizeAddress('123 South Main St')).toBe('123 s main st');
      expect(normalizeAddress('123 East Main St')).toBe('123 e main st');
      expect(normalizeAddress('123 West Main St')).toBe('123 w main st');
      expect(normalizeAddress('123 Northeast Main St')).toBe('123 ne main st');
    });

    it('should handle empty string', () => {
      expect(normalizeAddress('')).toBe('');
      expect(normalizeAddress(null as any)).toBe('');
    });

    it('should handle complex real-world addresses', () => {
      const input = '  123, North Main Street, Apt. #5  ';
      const expected = '123 n main st apt 5';
      expect(normalizeAddress(input)).toBe(expected);
    });
  });

  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should calculate distance for single character difference', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
    });

    it('should calculate distance for insertion', () => {
      expect(levenshteinDistance('hello', 'helllo')).toBe(1);
    });

    it('should calculate distance for deletion', () => {
      expect(levenshteinDistance('hello', 'helo')).toBe(1);
    });

    it('should calculate distance for completely different strings', () => {
      const dist = levenshteinDistance('abc', 'xyz');
      expect(dist).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('hello', '')).toBe(5);
      expect(levenshteinDistance('', 'hello')).toBe(5);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical addresses', () => {
      const similarity = calculateSimilarity('123 Main St', '123 Main St');
      expect(similarity).toBe(1.0);
    });

    it('should return 1.0 for addresses that normalize to same', () => {
      const similarity = calculateSimilarity('123 Main Street', '123 Main St');
      expect(similarity).toBeGreaterThan(0.95);
    });

    it('should return high similarity for minor differences', () => {
      const similarity = calculateSimilarity('123 Main St', '123 Main Street');
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should return low similarity for different addresses', () => {
      const similarity = calculateSimilarity('123 Main St', '456 Oak Ave');
      expect(similarity).toBeLessThan(0.5);
    });

    it('should return 0 for empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(1.0); // Empty equals empty
      expect(calculateSimilarity('123 Main St', '')).toBe(0.0);
      expect(calculateSimilarity('', '123 Main St')).toBe(0.0);
    });

    it('should handle case insensitivity', () => {
      const similarity = calculateSimilarity('123 MAIN ST', '123 main st');
      expect(similarity).toBe(1.0);
    });

    it('should handle abbreviations correctly', () => {
      const testCases = [
        { addr1: '123 N Main St', addr2: '123 North Main Street', expected: 0.9 },
        { addr1: '123 S Oak Ave', addr2: '123 South Oak Avenue', expected: 0.9 },
        { addr1: '123 E Elm Dr', addr2: '123 East Elm Drive', expected: 0.9 },
      ];

      testCases.forEach(({ addr1, addr2, expected }) => {
        const similarity = calculateSimilarity(addr1, addr2);
        expect(similarity).toBeGreaterThan(expected);
      });
    });
  });

  describe('findMatchingHomeowner', () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should find exact match', async () => {
      const mockHomeowners = [
        { id: '1', name: 'John Doe', address: '123 Main St' },
        { id: '2', name: 'Jane Smith', address: '456 Oak Ave' },
      ];

      mockDb.from.mockResolvedValueOnce(mockHomeowners);

      const result = await findMatchingHomeowner(mockDb, '123 Main St');

      expect(result).not.toBeNull();
      expect(result?.homeowner.id).toBe('1');
      expect(result?.similarity).toBeGreaterThan(0.99);
    });

    it('should find fuzzy match', async () => {
      const mockHomeowners = [
        { id: '1', name: 'John Doe', address: '123 Main Street' },
      ];

      mockDb.from.mockResolvedValueOnce(mockHomeowners);

      const result = await findMatchingHomeowner(mockDb, '123 Main St');

      expect(result).not.toBeNull();
      expect(result?.homeowner.id).toBe('1');
      expect(result?.similarity).toBeGreaterThan(0.9);
    });

    it('should return null when no match above threshold', async () => {
      const mockHomeowners = [
        { id: '1', name: 'John Doe', address: '789 Elm St' },
      ];

      mockDb.from.mockResolvedValueOnce(mockHomeowners);

      const result = await findMatchingHomeowner(mockDb, '123 Main St', {
        minSimilarity: 0.8,
      });

      expect(result).toBeNull();
    });

    it('should return best match when multiple candidates', async () => {
      const mockHomeowners = [
        { id: '1', name: 'John Doe', address: '123 Main Street' },
        { id: '2', name: 'Jane Smith', address: '123 Main St' }, // Closer match
        { id: '3', name: 'Bob Johnson', address: '456 Oak Ave' },
      ];

      mockDb.from.mockResolvedValueOnce(mockHomeowners);

      const result = await findMatchingHomeowner(mockDb, '123 Main St');

      expect(result).not.toBeNull();
      expect(result?.homeowner.id).toBe('2'); // Exact match
      expect(result?.similarity).toBeGreaterThan(0.99);
    });

    it('should skip homeowners with no address', async () => {
      const mockHomeowners = [
        { id: '1', name: 'John Doe', address: '' },
        { id: '2', name: 'Jane Smith', address: null },
        { id: '3', name: 'Bob Johnson', address: '123 Main St' },
      ];

      mockDb.from.mockResolvedValueOnce(mockHomeowners);

      const result = await findMatchingHomeowner(mockDb, '123 Main St');

      expect(result).not.toBeNull();
      expect(result?.homeowner.id).toBe('3');
    });

    it('should return null for empty address input', async () => {
      const result = await findMatchingHomeowner(mockDb, '');
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockDb.from.mockRejectedValueOnce(new Error('Database error'));

      await expect(findMatchingHomeowner(mockDb, '123 Main St')).rejects.toThrow('Failed to match homeowner');
    });
  });

  describe('findMultipleMatches', () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
    };

    it('should return multiple matches sorted by similarity', async () => {
      const mockHomeowners = [
        { id: '1', name: 'John Doe', address: '123 Main Street' },
        { id: '2', name: 'Jane Smith', address: '123 Main St' },
        { id: '3', name: 'Bob Johnson', address: '123 Main' },
        { id: '4', name: 'Alice Brown', address: '456 Oak Ave' },
      ];

      mockDb.from.mockResolvedValueOnce(mockHomeowners);

      const results = await findMultipleMatches(mockDb, '123 Main St', {
        minSimilarity: 0.5,
        limit: 3,
      });

      expect(results.length).toBeLessThanOrEqual(3);
      expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
      // Should not include Oak Ave (too different)
      expect(results.find(r => r.homeowner.address === '456 Oak Ave')).toBeUndefined();
    });

    it('should respect the limit parameter', async () => {
      const mockHomeowners = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        name: `Person ${i}`,
        address: `${120 + i} Main St`,
      }));

      mockDb.from.mockResolvedValueOnce(mockHomeowners);

      const results = await findMultipleMatches(mockDb, '123 Main St', {
        limit: 3,
      });

      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('areAddressesSimilar', () => {
    it('should return true for very similar addresses', () => {
      expect(areAddressesSimilar('123 Main St', '123 Main Street')).toBe(true);
    });

    it('should return false for dissimilar addresses', () => {
      expect(areAddressesSimilar('123 Main St', '456 Oak Ave')).toBe(false);
    });

    it('should use custom threshold', () => {
      expect(areAddressesSimilar('123 Main St', '124 Main St', 0.95)).toBe(false);
      expect(areAddressesSimilar('123 Main St', '124 Main St', 0.80)).toBe(true);
    });
  });

  describe('extractStreetNumber', () => {
    it('should extract street number', () => {
      expect(extractStreetNumber('123 Main St')).toBe('123');
      expect(extractStreetNumber('456 Oak Ave')).toBe('456');
    });

    it('should return null if no number', () => {
      expect(extractStreetNumber('Main Street')).toBeNull();
      expect(extractStreetNumber('')).toBeNull();
    });
  });

  describe('extractStreetName', () => {
    it('should extract street name without number', () => {
      const result = extractStreetName('123 Main St');
      expect(result).not.toContain('123');
      expect(result).toContain('main');
    });

    it('should return normalized street name', () => {
      const result = extractStreetName('123 Main Street');
      expect(result).toContain('main st');
    });
  });

  describe('getMatchQualityDescription', () => {
    it('should return correct descriptions for similarity scores', () => {
      expect(getMatchQualityDescription(0.98)).toBe('Excellent match');
      expect(getMatchQualityDescription(0.90)).toBe('Very good match');
      expect(getMatchQualityDescription(0.75)).toBe('Good match');
      expect(getMatchQualityDescription(0.60)).toBe('Fair match');
      expect(getMatchQualityDescription(0.30)).toBe('Weak match');
    });
  });
});

