/**
 * Document-related utility functions
 * Pure functions with no dependencies on React hooks or component state
 */

import type { Document } from '../../types';

/**
 * Checks if a document is a PDF based on type, name, or URL
 * @param doc - Document object
 * @returns True if document is a PDF
 */
export function isPDFDocument(doc: Document): boolean {
  return (
    doc.type === 'PDF' ||
    doc.name.toLowerCase().endsWith('.pdf') ||
    doc.url.startsWith('data:application/pdf') ||
    doc.url.includes('pdf')
  );
}

/**
 * Gets the file extension from a document name
 * @param fileName - Name of the file
 * @returns File extension (e.g., "pdf", "jpg") or empty string
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Checks if a document is an image based on file extension
 * @param doc - Document object
 * @returns True if document is an image
 */
export function isImageDocument(doc: Document): boolean {
  const ext = getFileExtension(doc.name);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
}
