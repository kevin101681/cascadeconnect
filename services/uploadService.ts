/**
 * UPLOAD SERVICE (CLIENT-SIDE)
 * Handles file uploads to Cloudinary via backend API
 * January 3, 2026
 */

/**
 * Upload a file to Cloudinary
 * @param file - File to upload
 * @param folder - Cloudinary folder (default: 'warranty-claims')
 * @returns Upload result with URL and metadata
 */
export async function uploadToCloudinary(
  file: File,
  folder: string = 'warranty-claims'
): Promise<{
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  bytes: number;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  // Try Netlify function first, fall back to local server
  const uploadUrls = [
    '/.netlify/functions/upload',
    '/api/upload',
    'http://localhost:3000/api/upload'
  ];

  let lastError: Error | null = null;

  for (const url of uploadUrls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Return in the format expected by the chat component
      return {
        secure_url: data.url,
        public_id: data.publicId,
        format: data.type?.toLowerCase() || 'unknown',
        resource_type: data.type?.toLowerCase() || 'raw',
        bytes: data.size || 0,
      };
    } catch (error) {
      console.warn(`Upload attempt failed for ${url}:`, error);
      lastError = error as Error;
      // Continue to next URL
    }
  }

  // If all attempts failed, throw the last error
  throw new Error(`Failed to upload file: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Upload a file from a Data URL or Blob
 * @param dataUrl - Data URL or Blob
 * @param filename - Original filename
 * @param folder - Cloudinary folder
 * @returns Upload result
 */
export async function uploadDataUrl(
  dataUrl: string | Blob,
  filename: string,
  folder: string = 'warranty-claims'
): Promise<{
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  bytes: number;
}> {
  // Convert data URL to File object
  let file: File;
  
  if (dataUrl instanceof Blob) {
    file = new File([dataUrl], filename, { type: dataUrl.type });
  } else {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    file = new File([blob], filename, { type: blob.type });
  }

  return uploadToCloudinary(file, folder);
}

/**
 * Delete a file from Cloudinary (requires backend endpoint)
 * @param publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  // This would need a backend endpoint
  // For now, just log a warning
  console.warn('Delete from Cloudinary not implemented yet:', publicId);
}

