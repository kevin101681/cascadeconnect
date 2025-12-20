import { pdfjs } from 'react-pdf';

// Centralized PDF.js worker configuration
// This ensures the worker is set up before any PDF operations
if (typeof window !== 'undefined') {
  // Use the CDN URL that matches react-pdf's internal pdfjs version
  // react-pdf uses pdfjs-dist 5.4.296, so we use that version's worker
  const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  
  // Only set if not already configured
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    console.log('PDF.js worker configured:', workerUrl);
  }
  
  // Disable fake worker fallback to prevent the error
  // This ensures we always use the real worker from CDN
  if ((pdfjs as any).GlobalWorkerOptions?.workerPort) {
    (pdfjs as any).GlobalWorkerOptions.workerPort = null;
  }
}

export default pdfjs;

