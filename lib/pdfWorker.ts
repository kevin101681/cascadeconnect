import { pdfjs } from 'react-pdf';

// Centralized PDF.js worker configuration
// This ensures the worker is set up before any PDF operations
if (typeof window !== 'undefined') {
  // Use the CDN URL that matches react-pdf's internal pdfjs version
  // react-pdf uses pdfjs-dist 5.4.296, so we use that version's worker
  const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  
  // Always set the worker URL to ensure it's configured
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  console.log('PDF.js worker configured:', workerUrl);
  
  // Prevent fake worker from being used
  // Set disableAutoFetch to false and ensure worker is always from CDN
  if ((pdfjs as any).GlobalWorkerOptions) {
    // Disable any fake worker setup
    (pdfjs as any).GlobalWorkerOptions.disableAutoFetch = false;
    (pdfjs as any).GlobalWorkerOptions.isEvalSupported = true;
    
    // Ensure workerPort is null to prevent fake worker
    if ((pdfjs as any).GlobalWorkerOptions.workerPort) {
      (pdfjs as any).GlobalWorkerOptions.workerPort = null;
    }
  }
  
  // Monitor and fix worker URL if it gets changed to a fake worker
  // Use a MutationObserver or setInterval to check and fix the worker URL
  const checkWorkerUrl = () => {
    if (pdfjs.GlobalWorkerOptions.workerSrc) {
      const currentSrc = pdfjs.GlobalWorkerOptions.workerSrc;
      if (currentSrc.includes('fake') ||
          currentSrc.includes('pdf.worker.mjs') ||
          (!currentSrc.startsWith('http') && currentSrc !== workerUrl)) {
        console.warn('PDF.js worker URL changed to invalid value, resetting to CDN:', currentSrc);
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      }
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    }
  };
  
  // Check worker URL periodically and before any PDF operations
  setInterval(checkWorkerUrl, 1000);
  
  // Also check when getDocument might be called
  // We'll use a proxy-like approach by storing the original and checking in components
}

export default pdfjs;

