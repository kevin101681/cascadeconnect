/**
 * UPLOAD SERVICE
 * Centralized file upload handling for Cloudinary
 * Follows .cursorrules: Type safety, error handling, env checks
 */

import { Attachment } from '../../types';
import { logError, addBreadcrumb, captureException } from './errorTrackingService';
import { checkRateLimit, RateLimitPresets } from './rateLimitService';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface UploadResult {
  success: boolean;
  attachment?: Attachment;
  error?: string;
}

export interface UploadOptions {
  maxRetries?: number;
  timeoutMs?: number;
  maxFileSizeMB?: number;
}

export interface UploadProgress {
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

// ==========================================
// CONFIGURATION
// ==========================================

const DEFAULT_OPTIONS: Required<UploadOptions> = {
  maxRetries: 3,
  timeoutMs: 60000, // 60 seconds
  maxFileSizeMB: 10,
};

/**
 * Get the API endpoint for uploads
 * Always uses Netlify functions endpoint (works in both dev and production)
 */
export function getUploadEndpoint(): string {
  // Always use Netlify functions endpoint
  // netlify dev will route this correctly locally
  return '/.netlify/functions/upload';
}

/**
 * Get Cloudinary unsigned upload endpoint for large files
 * Bypasses Netlify's 6MB function payload limit
 */
export function getCloudinaryDirectEndpoint(): string {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  return `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
}

/**
 * Get Cloudinary upload preset for unsigned uploads
 */
export function getCloudinaryUploadPreset(): string {
  return import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'cascade-unsigned';
}

// ==========================================
// VALIDATION
// ==========================================

/**
 * Validate file before upload
 */
export function validateFile(file: File, options: UploadOptions = {}): { valid: boolean; error?: string } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Check file size
  const maxBytes = opts.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File is too large (max ${opts.maxFileSizeMB}MB)`,
    };
  }

  // Check if file exists
  if (!file || !file.name) {
    return {
      valid: false,
      error: 'Invalid file',
    };
  }

  return { valid: true };
}

// ==========================================
// UPLOAD FUNCTIONS
// ==========================================

/**
 * Upload a single file with retry logic
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Add breadcrumb for tracking
  addBreadcrumb('uploadFile', { fileName: file.name, fileSize: file.size });
  
  console.log(`📤 Uploading file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

  // Check rate limit (10 uploads per hour)
  const rateLimitResult = checkRateLimit(
    `upload:${file.name}:${Date.now()}`,
    RateLimitPresets.FILE_UPLOAD
  );
  
  if (!rateLimitResult.allowed) {
    const error = `Upload rate limit exceeded. Try again in ${rateLimitResult.retryAfter}s`;
    logError(error, { 
      service: 'uploadService', 
      operation: 'uploadFile',
      fileName: file.name 
    }, 'warning');
    
    return {
      success: false,
      error,
    };
  }

  // Validate file
  const validation = validateFile(file, opts);
  if (!validation.valid) {
    const errorMsg = `File validation failed: ${validation.error}`;
    console.error(`❌ ${errorMsg}`);
    logError(errorMsg, { 
      service: 'uploadService',
      operation: 'validateFile',
      fileName: file.name,
      fileSize: file.size 
    }, 'warning');
    
    return {
      success: false,
      error: validation.error,
    };
  }

  // Retry loop with error tracking
  return captureException(async () => {
    // Always use Cloudinary direct upload for speed and reliability
    // Bypasses Netlify's 6MB limit and timeout issues
    console.log(`📤 Uploading to Cloudinary: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', getCloudinaryUploadPreset());
      formData.append('folder', 'warranty-claims');
      
      const endpoint = getCloudinaryDirectEndpoint();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.secure_url) {
        throw new Error('Upload failed: No URL returned');
      }
      
      console.log(`✅ Upload successful: ${file.name}`);
      addBreadcrumb('uploadFile:success', { fileName: file.name, url: result.secure_url });
      
      return {
        success: true,
        attachment: {
          id: result.public_id || crypto.randomUUID(),
          url: result.secure_url,
          name: file.name,
          type: determineFileType(file),
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = `Upload timed out after ${opts.timeoutMs / 1000} seconds`;
        console.error(`❌ ${timeoutError}`);
        logError(timeoutError, {
          service: 'uploadService',
          operation: 'uploadFile',
          fileName: file.name,
        }, 'error');
        
        return {
          success: false,
          error: timeoutError,
        };
      }
      
      console.error(`❌ Upload failed:`, errorMessage);
      
      logError(`Upload failed: ${errorMessage}`, {
        service: 'uploadService',
        operation: 'directUpload',
        fileName: file.name,
        fileSize: file.size,
      }, 'error');
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, {
    service: 'uploadService',
    operation: 'uploadFile',
    fileName: file.name,
  });
}

/**
 * Detect if the user is on a mobile device
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  
  // Also check for touch support and screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  return mobileRegex.test(userAgent) || (hasTouch && isSmallScreen);
}

/**
 * Upload files with concurrency limit
 * Prevents overwhelming mobile connections
 */
async function uploadFilesWithConcurrency(
  files: File[],
  options: UploadOptions,
  maxConcurrent: number
): Promise<UploadResult[]> {
  const results: UploadResult[] = new Array(files.length);

  console.log(`🔄 Uploading with concurrency limit: ${maxConcurrent}`);

  // Process files in chunks
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const chunk = files.slice(i, i + maxConcurrent);
    const chunkPromises = chunk.map(async (file, chunkIndex) => {
      const fileIndex = i + chunkIndex;
      console.log(`📤 [${fileIndex + 1}/${files.length}] Starting upload: ${file.name}`);
      
      try {
        const result = await uploadFile(file, options);
        results[fileIndex] = result;
        
        if (result.success) {
          console.log(`✅ [${fileIndex + 1}/${files.length}] ${file.name} uploaded successfully`);
        } else {
          console.error(`❌ [${fileIndex + 1}/${files.length}] ${file.name} failed: ${result.error}`);
        }
        
        return result;
      } catch (error) {
        // Failsafe - uploadFile should handle errors internally
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ [${fileIndex + 1}/${files.length}] ${file.name} exception:`, errorMsg);
        results[fileIndex] = {
          success: false,
          error: errorMsg
        };
        return results[fileIndex];
      }
    });

    // Wait for this chunk to complete before starting the next
    await Promise.all(chunkPromises);
  }

  return results;
}

/**
 * Upload multiple files with smart concurrency control
 * All files upload directly to Cloudinary for speed and reliability
 * - On mobile: uploads 3 at a time (direct upload is reliable)
 * - On desktop: uploads all in parallel
 * Returns results for all files (both successes and failures)
 */
export async function uploadMultipleFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<{
  successes: Attachment[];
  failures: Array<{ file: File; error: string }>;
}> {
  console.log(`📤 Starting batch upload of ${files.length} file(s)`);

  const isMobile = isMobileDevice();
  
  // Adjust timeouts and concurrency for mobile
  const adjustedOptions = {
    ...options,
    // Increase timeout on mobile to handle slower connections
    timeoutMs: isMobile 
      ? Math.max(options.timeoutMs || DEFAULT_OPTIONS.timeoutMs, 120000) // 2 min for mobile
      : (options.timeoutMs || DEFAULT_OPTIONS.timeoutMs),
  };

  console.log(`📱 Device type: ${isMobile ? 'Mobile' : 'Desktop'}`);

  let results: UploadResult[];

  if (isMobile && files.length > 1) {
    // Direct uploads to Cloudinary are reliable - can do 3 concurrent on mobile
    const maxConcurrent = Math.min(3, files.length);
    console.log(`📱 Using mobile upload strategy: ${maxConcurrent} concurrent direct uploads`);
    results = await uploadFilesWithConcurrency(files, adjustedOptions, maxConcurrent);
  } else {
    // On desktop, upload all in parallel for speed
    console.log(`💻 Using desktop upload strategy: parallel uploads`);
    results = await Promise.all(
      files.map(file => uploadFile(file, adjustedOptions))
    );
  }

  const successes: Attachment[] = [];
  const failures: Array<{ file: File; error: string }> = [];

  results.forEach((result, index) => {
    const file = files[index];
    if (result.success && result.attachment) {
      successes.push(result.attachment);
    } else {
      failures.push({
        file,
        error: result.error || 'Unknown error',
      });
    }
  });

  console.log(`✅ Batch upload complete: ${successes.length} succeeded, ${failures.length} failed`);

  return { successes, failures };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Determine file type from File object
 */
function determineFileType(file: File): 'IMAGE' | 'VIDEO' | 'DOCUMENT' {
  const mimeType = file.type.toLowerCase();
  
  if (mimeType.startsWith('image/')) {
    return 'IMAGE';
  }
  
  if (mimeType.startsWith('video/')) {
    return 'VIDEO';
  }
  
  return 'DOCUMENT';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if a file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

