import { pdfjs } from 'react-pdf';
// Import centralized PDF worker setup
import './pdfWorker';

/**
 * Generates a thumbnail image from the first page of a PDF
 * @param pdfUrl - URL or data URL of the PDF
 * @param maxWidth - Maximum width of the thumbnail (default: 300)
 * @param maxHeight - Maximum height of the thumbnail (default: 400)
 * @returns Promise resolving to a data URL of the thumbnail image
 */
export async function generatePDFThumbnail(
  pdfUrl: string,
  maxWidth: number = 300,
  maxHeight: number = 400
): Promise<string> {
  try {
    // Ensure worker is set to CDN URL before loading PDF
    const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    if (!pdfjs.GlobalWorkerOptions.workerSrc || 
        pdfjs.GlobalWorkerOptions.workerSrc.includes('fake') ||
        pdfjs.GlobalWorkerOptions.workerSrc.includes('pdf.worker.mjs') ||
        !pdfjs.GlobalWorkerOptions.workerSrc.startsWith('http')) {
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    }
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;

    // Get the first page
    const page = await pdf.getPage(1);
    
    // Calculate scale to fit within max dimensions while maintaining aspect ratio
    const viewport = page.getViewport({ scale: 1.0 });
    const aspectRatio = viewport.width / viewport.height;
    
    let scale = 1.0;
    if (viewport.width > maxWidth) {
      scale = maxWidth / viewport.width;
    }
    if (viewport.height * scale > maxHeight) {
      scale = Math.min(scale, maxHeight / viewport.height);
    }

    // Get scaled viewport
    const scaledViewport = page.getViewport({ scale });
    const width = scaledViewport.width;
    const height = scaledViewport.height;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
      canvas: canvas,
    }).promise;

    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG with 85% quality for smaller size
    
    return dataUrl;
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    throw error;
  }
}
