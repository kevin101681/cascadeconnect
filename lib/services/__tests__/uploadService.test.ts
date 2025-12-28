/**
 * UNIT TESTS FOR UPLOAD SERVICE
 * Tests file upload, validation, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  uploadFile,
  uploadMultipleFiles,
  validateFile,
  getUploadEndpoint,
  formatFileSize,
  isImageFile,
  isVideoFile,
} from '../uploadService';

// Mock fetch globally
global.fetch = vi.fn();

describe('uploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location for endpoint tests
    global.window = {
      location: {
        hostname: 'localhost',
        protocol: 'http:',
      },
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUploadEndpoint', () => {
    it('should return localhost endpoint for local development', () => {
      const endpoint = getUploadEndpoint();
      expect(endpoint).toBe('http://localhost:3000/api/upload');
    });

    it('should return production endpoint for production', () => {
      global.window.location.hostname = 'cascadeconnect.app';
      global.window.location.protocol = 'https:';
      
      const endpoint = getUploadEndpoint();
      expect(endpoint).toBe('https://www.cascadeconnect.app/api/upload');
    });

    it('should add www prefix if not present', () => {
      global.window.location.hostname = 'example.com';
      global.window.location.protocol = 'https:';
      
      const endpoint = getUploadEndpoint();
      expect(endpoint).toContain('www.example.com');
    });

    it('should not duplicate www prefix', () => {
      global.window.location.hostname = 'www.example.com';
      
      const endpoint = getUploadEndpoint();
      expect(endpoint).toBe('https://www.example.com/api/upload');
    });
  });

  describe('validateFile', () => {
    it('should accept valid file within size limit', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB
      
      const result = validateFile(file, { maxFileSizeMB: 10 });
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file exceeding size limit', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateFile(file, { maxFileSizeMB: 10 });
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should reject invalid file', () => {
      const result = validateFile(null as any);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file');
    });
  });

  describe('uploadFile', () => {
    it('should successfully upload a file', async () => {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const mockResponse = {
        success: true,
        url: 'https://cloudinary.com/test.jpg',
        publicId: 'test-id',
        type: 'IMAGE',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await uploadFile(file);

      expect(result.success).toBe(true);
      expect(result.attachment).toBeDefined();
      expect(result.attachment?.url).toBe(mockResponse.url);
      expect(result.attachment?.type).toBe('IMAGE');
    });

    it('should retry on failure', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });

      // Fail twice, succeed on third attempt
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            url: 'https://cloudinary.com/test.jpg',
            publicId: 'test-id',
          }),
        });

      const result = await uploadFile(file, { maxRetries: 3 });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await uploadFile(file, { maxRetries: 2 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('after 2 retries');
    });

    it('should handle timeout', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });

      (global.fetch as any).mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 100000))
      );

      const result = await uploadFile(file, { timeoutMs: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should handle HTTP error responses', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 413,
        text: async () => 'File too large',
      });

      const result = await uploadFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('413');
    });
  });

  describe('uploadMultipleFiles', () => {
    it('should upload multiple files successfully', async () => {
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];
      
      files.forEach(file => Object.defineProperty(file, 'size', { value: 1024 }));

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          url: 'https://cloudinary.com/test.jpg',
          publicId: 'test-id',
        }),
      });

      const result = await uploadMultipleFiles(files);

      expect(result.successes).toHaveLength(2);
      expect(result.failures).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];
      
      files.forEach(file => Object.defineProperty(file, 'size', { value: 1024 }));

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            url: 'https://cloudinary.com/test1.jpg',
            publicId: 'test1-id',
          }),
        })
        .mockRejectedValueOnce(new Error('Upload failed'));

      const result = await uploadMultipleFiles(files, { maxRetries: 1 });

      expect(result.successes).toHaveLength(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].error).toContain('Upload failed');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format decimal sizes', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('isImageFile', () => {
    it('should identify image files', () => {
      expect(isImageFile(new File([''], 'test.jpg', { type: 'image/jpeg' }))).toBe(true);
      expect(isImageFile(new File([''], 'test.png', { type: 'image/png' }))).toBe(true);
      expect(isImageFile(new File([''], 'test.gif', { type: 'image/gif' }))).toBe(true);
    });

    it('should reject non-image files', () => {
      expect(isImageFile(new File([''], 'test.pdf', { type: 'application/pdf' }))).toBe(false);
      expect(isImageFile(new File([''], 'test.txt', { type: 'text/plain' }))).toBe(false);
    });
  });

  describe('isVideoFile', () => {
    it('should identify video files', () => {
      expect(isVideoFile(new File([''], 'test.mp4', { type: 'video/mp4' }))).toBe(true);
      expect(isVideoFile(new File([''], 'test.mov', { type: 'video/quicktime' }))).toBe(true);
    });

    it('should reject non-video files', () => {
      expect(isVideoFile(new File([''], 'test.jpg', { type: 'image/jpeg' }))).toBe(false);
      expect(isVideoFile(new File([''], 'test.pdf', { type: 'application/pdf' }))).toBe(false);
    });
  });
});

