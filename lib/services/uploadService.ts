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
    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
      try {
        console.log(`🔄 Upload attempt ${attempt}/${opts.maxRetries} for ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);

        const endpoint = getUploadEndpoint();

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Handle HTTP errors
          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw new Error(`Upload failed (${response.status}): ${errorText}`);
          }

          // Parse response
          const result = await response.json();

          // Validate response structure
          if (!result.success || !result.url) {
            throw new Error(result.error || 'Upload failed: No URL returned');
          }

          // Success!
          console.log(`✅ Upload successful: ${file.name}`);
          addBreadcrumb('uploadFile:success', { fileName: file.name, url: result.url });
          
          return {
            success: true,
            attachment: {
              id: result.publicId || crypto.randomUUID(),
              url: result.url,
              name: file.name,
              type: result.type || determineFileType(file),
          },
        };

      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        // Handle abort/timeout
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          const timeoutError = `Upload timed out after ${opts.timeoutMs / 1000} seconds`;
          logError(timeoutError, {
            service: 'uploadService',
            operation: 'uploadFile',
            fileName: file.name,
            attempt,
          }, 'error');
          throw new Error(timeoutError);
        }
        
        throw fetchError;
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Upload attempt ${attempt} failed:`, errorMessage);
      
      // Log error on final attempt
      if (attempt === opts.maxRetries) {
        logError(`Upload failed after ${opts.maxRetries} retries: ${errorMessage}`, {
          service: 'uploadService',
          operation: 'uploadFile',
          fileName: file.name,
          fileSize: file.size,
          attempts: opts.maxRetries,
        }, 'error');
      }
      
      // If this was the last attempt, return failure
      if (attempt === opts.maxRetries) {
        return {
          success: false,
          error: `Upload failed after ${opts.maxRetries} retries: ${errorMessage}`,
        };
      }
      
      // Wait before retry (exponential backoff)
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  // Should never reach here, but TypeScript needs it
  return {
    success: false,
    error: 'Upload failed: Unexpected error',
  };
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
 * - On mobile: uploads sequentially or with low concurrency (2 at a time)
 * - On desktop: uploads in parallel
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
    // On mobile, upload files one at a time to prevent connection issues
    // Mobile browsers have strict limits and can drop concurrent connections
    console.log(`📱 Using mobile upload strategy: sequential uploads (one at a time)`);
    console.log(`📱 This is slower but much more reliable on mobile devices`);
    
    results = new Array(files.length);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📤 [${i + 1}/${files.length}] Uploading: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      const result = await uploadFile(file, adjustedOptions);
      results[i] = result;
      
      if (result.success) {
        console.log(`✅ [${i + 1}/${files.length}] Success: ${file.name}`);
      } else {
        console.error(`❌ [${i + 1}/${files.length}] Failed: ${file.name} - ${result.error}`);
      }
      
      // Small delay between uploads on mobile to prevent throttling
      if (i < files.length - 1) {
        console.log(`⏳ Waiting 500ms before next upload...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
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

