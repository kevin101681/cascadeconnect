import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { HomeownerDocument } from '../types';

// Set up PDF.js worker - use the version that matches react-pdf's internal pdfjs
// react-pdf 10.2.0 uses pdfjs-dist 5.4.296, so we use that version's worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  document: HomeownerDocument;
  isOpen: boolean;
  onClose: () => void;
}

interface PDFPageProps {
  pageNumber: number;
  width: number;
  height: number;
}

// Page component wrapped in forwardRef as required by react-pageflip
const PDFPage = forwardRef<HTMLDivElement, PDFPageProps>(({ pageNumber, width, height }, ref) => {
  return (
    <div 
      ref={ref} 
      className="pdf-page" 
      style={{ 
        width, 
        height, 
        padding: 0, 
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      <div style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        backgroundColor: '#fff'
      }}>
        <Page
          pageNumber={pageNumber}
          width={width}
          height={height}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={
            <div style={{ 
              width, 
              height, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: '#f0f0f0' 
            }}>
              Loading page...
            </div>
          }
          error={
            <div style={{ 
              width, 
              height, 
              display: 'flex',
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: '#fee', 
              color: '#c00' 
            }}>
              Error loading page
            </div>
          }
        />
      </div>
    </div>
  );
});

PDFPage.displayName = 'PDFPage';

const PDFViewer: React.FC<PDFViewerProps> = ({ document: doc, isOpen, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 800, height: 1200 });
  const [currentPage, setCurrentPage] = useState(1);
  const flipBookRef = useRef<any>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Calculate dimensions that fit within viewport with padding
  useEffect(() => {
    if (!isOpen) return;

    const updateDimensions = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 80; // Padding around the book
      const maxWidth = viewportWidth - padding;
      const maxHeight = viewportHeight - padding;

      // Maintain 2:3 aspect ratio (common for PDF pages)
      const aspectRatio = 2 / 3;
      
      let width = Math.min(800, maxWidth);
      let height = width / aspectRatio;

      // If height is too large, scale down based on height
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      setPageDimensions({ width: Math.round(width), height: Math.round(height) });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !doc.url) {
      return;
    }

    const preparePdfUrl = async () => {
      try {
        setDocumentLoading(true);
        setError(null);
        setNumPages(0);

        // Cleanup previous blob URL if exists
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }

        let finalUrl = doc.url;

        // Convert data URL to blob URL for better compatibility
        if (doc.url.startsWith('data:')) {
          const base64Data = doc.url.split(',')[1];
          if (!base64Data) {
            throw new Error('Invalid data URL format');
          }

          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });

          if (blob.size === 0) {
            throw new Error('Invalid PDF data - file appears to be empty');
          }

          const blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = blobUrl;
          finalUrl = blobUrl;
        }

        setPdfUrl(finalUrl);
      } catch (err: any) {
        console.error('PDF preparation error:', err);
        setError(err.message || 'Failed to prepare PDF');
        setDocumentLoading(false);
      }
    };

    preparePdfUrl();

    // Cleanup on unmount or close
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isOpen, doc.url]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully, numPages:', numPages);
    setNumPages(numPages);
    setDocumentLoading(false);
    setError(null);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    if (flipBookRef.current && currentPage > 1) {
      const pageFlip = flipBookRef.current.pageFlip();
      // Use flipPrev with 'top' to ensure consistent animation from left side
      // This creates the reverse of the forward animation
      pageFlip.flipPrev('top');
      // Update currentPage immediately as fallback in case flip event doesn't fire
      setCurrentPage(prev => Math.max(1, prev - 1));
    }
  };

  const handleNextPage = () => {
    if (flipBookRef.current && currentPage < numPages) {
      const pageFlip = flipBookRef.current.pageFlip();
      // Use flipNext with 'top' to ensure consistent animation from right side
      pageFlip.flipNext('top');
      // Update currentPage immediately as fallback in case flip event doesn't fire
      setCurrentPage(prev => Math.min(numPages, prev + 1));
    }
  };

  // Listen for page changes from the flipbook
  useEffect(() => {
    if (!flipBookRef.current || numPages === 0) return;

    const flipBook = flipBookRef.current.pageFlip();
    if (!flipBook) return;

    const handleFlip = (e: any) => {
      // The flip event provides the new page index (0-based)
      const newPage = (e?.data ?? flipBook.getCurrentPageIndex()) + 1;
      setCurrentPage(newPage);
    };

    // Also listen for flipStart to catch page changes earlier
    const handleFlipStart = (e: any) => {
      // Update page immediately when flip starts
      const newPage = (e?.data ?? flipBook.getCurrentPageIndex()) + 1;
      setCurrentPage(newPage);
    };

    try {
      flipBook.on('flip', handleFlip);
      flipBook.on('flipStart', handleFlipStart);
    } catch (err) {
      console.warn('Could not attach flip event listener:', err);
    }

    return () => {
      try {
        flipBook.off('flip', handleFlip);
        flipBook.off('flipStart', handleFlipStart);
      } catch (err) {
        // Ignore cleanup errors
      }
    };
  }, [numPages]);

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError(error.message || 'Failed to load PDF');
    setDocumentLoading(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Close FAB */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-[1001] bg-primary hover:bg-primary/90 text-primary-on rounded-full p-3 shadow-elevation-3 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
        title="Close"
        aria-label="Close PDF viewer"
      >
        <X className="h-6 w-6" />
      </button>

      <div
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', height: '100%', padding: '40px', boxSizing: 'border-box', overflow: 'hidden' }}
      >
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {pdfUrl && !error && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                <p className="mt-4">Loading PDF...</p>
              </div>
            }
          >
            {!documentLoading && numPages > 0 && (
              <div style={{ maxWidth: '100%', maxHeight: '100%', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                {/* Left Arrow Indicator - Outside document - Always visible */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (numPages > 1 && currentPage > 1) {
                      handlePrevPage();
                    }
                  }}
                  disabled={numPages <= 1 || currentPage <= 1}
                  className={`z-[1002] p-3 transition-all flex items-center justify-center ${
                    numPages > 1 && currentPage > 1
                      ? 'hover:scale-110 active:scale-95 cursor-pointer opacity-100'
                      : 'cursor-not-allowed opacity-30'
                  }`}
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-6 w-6 text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }} />
                </button>
                
                <HTMLFlipBook
                  ref={flipBookRef}
                  width={pageDimensions.width}
                  height={pageDimensions.height}
                  size="fixed"
                  showCover={false}
                  className="pdf-flipbook"
                  useMouseEvents={false}
                  disableFlipByClick={false}
                  flippingTime={600}
                  {...({} as any)}
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <PDFPage
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={pageDimensions.width}
                      height={pageDimensions.height}
                    />
                  ))}
                </HTMLFlipBook>

                {/* Right Arrow Indicator - Outside document - Always visible */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (numPages > 1 && currentPage < numPages) {
                      handleNextPage();
                    }
                  }}
                  disabled={numPages <= 1 || currentPage >= numPages}
                  className={`z-[1002] p-3 transition-all flex items-center justify-center ${
                    numPages > 1 && currentPage < numPages
                      ? 'hover:scale-110 active:scale-95 cursor-pointer opacity-100'
                      : 'cursor-not-allowed opacity-30'
                  }`}
                  title="Next page"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-6 w-6 text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }} />
                </button>
              </div>
            )}
          </Document>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
