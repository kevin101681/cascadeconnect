import { pdfjs } from 'react-pdf';

// Vite will bundle this as an asset URL (separate chunk) and only fetch it when PDF code is used.
// eslint-disable-next-line import/no-unresolved
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

let isConfigured = false;

/**
 * Configure the PDF.js worker **on-demand**.
 *
 * CRITICAL: Do not load/configure PDF.js globally at app startup. Only call this
 * from components/utilities that actually render PDFs (viewer, thumbnails, etc).
 */
export function ensurePdfWorkerConfigured(): void {
  if (isConfigured) return;
  if (typeof window === 'undefined') return;

  // Bundle the worker locally (no render-blocking CDN script, no global PDF.js).
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  isConfigured = true;
}

export default pdfjs;

