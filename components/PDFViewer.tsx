import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { HomeownerDocument } from '../types';
import { ensurePdfWorkerConfigured } from '../lib/pdfWorker';

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
        WebkitBackfaceVisibility: 'hidden',
        lineHeight: 0,
        fontSize: 0,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        backgroundColor: '#fff',
        margin: 0,
        padding: 0,
        lineHeight: 0,
        fontSize: 0,
        display: 'block',
        position: 'relative'
      }}>
        <div style={{ 
          margin: 0, 
          padding: 0, 
          display: 'block',
          height: '100%',
          width: '100%',
          lineHeight: 0,
          fontSize: 0,
          overflow: 'hidden'
        }}>
          <Page
            pageNumber={pageNumber}
            width={width}
            height={height}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="pdf-page-content"
            canvasBackground="transparent"
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

  // Configure PDF worker only when this viewer is opened
  useEffect(() => {
    if (!isOpen) return;
    ensurePdfWorkerConfigured();
  }, [isOpen]);

  // Helper to get current page directly from flipbook
  const getCurrentPageFromFlipbook = (): number => {
    if (!flipBookRef.current) return currentPage;
    try {
      const flipBook = flipBookRef.current.pageFlip();
      if (flipBook) {
        return flipBook.getCurrentPageIndex() + 1;
      }
    } catch (err) {
      // Ignore errors
    }
    return currentPage;
  };

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
      const flipBook = flipBookRef.current.pageFlip();
      if (!flipBook) return;
      
      // Find the flipbook container and try to trigger the library's internal click handler
      // by simulating a pointer event on the left side where users click manually
      const container = document.querySelector('.pdf-flipbook') as HTMLElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        // Click on the left side (15% from left edge) to trigger backward flip
        const clickX = rect.left + rect.width * 0.15;
        const clickY = rect.top + rect.height / 2;
        
        // Find the element at that point
        const target = document.elementFromPoint(clickX, clickY) || container;
        
        // Try using PointerEvent which is more modern and might be what the library listens to
        try {
          const pointerDown = new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            clientX: clickX,
            clientY: clickY,
            pointerId: 1,
            pointerType: 'mouse',
            button: 0,
            isPrimary: true
          });
          
          const pointerUp = new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            clientX: clickX,
            clientY: clickY,
            pointerId: 1,
            pointerType: 'mouse',
            button: 0,
            isPrimary: true
          });
          
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: clickX,
            clientY: clickY,
            button: 0,
            view: window
          });
          
          target.dispatchEvent(pointerDown);
          setTimeout(() => {
            target.dispatchEvent(pointerUp);
            setTimeout(() => {
              target.dispatchEvent(clickEvent);
            }, 10);
          }, 10);
          
          // Force update current page after animation
          setTimeout(() => {
            try {
              const currentIndex = flipBook.getCurrentPageIndex();
              setCurrentPage(currentIndex + 1);
            } catch (err) {
              // Ignore errors
            }
          }, 300);
          return;
        } catch (err) {
          // If PointerEvent doesn't work, fall through to programmatic method
        }
      }
      
      // Fallback: Try accessing the library's internal methods directly
      // The library might have different methods for programmatic vs user-triggered flips
      try {
        // Try flipPrev with 'top' corner first
        const result = flipBook.flipPrev('top');
        // If that returns something, it might have worked
        if (result !== undefined) {
          // Wait a bit to see if animation starts
          setTimeout(() => {
            try {
              const currentIndex = flipBook.getCurrentPageIndex();
              setCurrentPage(currentIndex + 1);
            } catch (err) {
              // Ignore errors
            }
          }, 150);
          return;
        }
      } catch (err) {
        // Continue to next attempt
      }
      
      // Try using flip() with the target page - this might force 3D mode
      try {
        const targetPageIndex = currentPage - 2;
        // Try with 'top' corner
        flipBook.flip(targetPageIndex, 'top');
      } catch (err) {
        // If that fails, try without corner parameter
        try {
          const targetPageIndex = currentPage - 2;
          flipBook.flip(targetPageIndex);
        } catch (err2) {
          console.warn('Could not trigger backward flip:', err2);
        }
      }
      
      // Force update current page after a short delay
      setTimeout(() => {
        try {
          const currentIndex = flipBook.getCurrentPageIndex();
          setCurrentPage(currentIndex + 1);
        } catch (err) {
          // Ignore errors
        }
      }, 150);
    }
  };

  const handleNextPage = () => {
    if (flipBookRef.current && currentPage < numPages) {
      const flipBook = flipBookRef.current.pageFlip();
      // Use flip() with target page and 'top' corner for consistent 3D flip animation
      // The target page is currentPage because currentPage is 1-based and equals the 0-based index of next page
      const targetPageIndex = currentPage;
      flipBook.flip(targetPageIndex, 'top');
      // Force update current page after a short delay
      setTimeout(() => {
        const currentIndex = flipBook.getCurrentPageIndex();
        setCurrentPage(currentIndex + 1);
      }, 100);
    }
  };

  // Listen for page changes from the flipbook
  useEffect(() => {
    if (!flipBookRef.current || numPages === 0) return;

    const flipBook = flipBookRef.current.pageFlip();
    if (!flipBook) return;

    const handleFlip = (e: any) => {
      // The flip event provides the new page index (0-based)
      // Try multiple ways to get the page index
      let newPageIndex = 0;
      if (e?.data !== undefined && e.data !== null) {
        newPageIndex = e.data;
      } else if (e?.target) {
        newPageIndex = e.target;
      } else {
        newPageIndex = flipBook.getCurrentPageIndex();
      }
      const newPage = newPageIndex + 1; // Convert to 1-based
      setCurrentPage(newPage);
    };

    // Also listen for page turning events
    const handlePageTurn = () => {
      const currentIndex = flipBook.getCurrentPageIndex();
      setCurrentPage(currentIndex + 1);
    };

    try {
      flipBook.on('flip', handleFlip);
      flipBook.on('changeState', handlePageTurn);
    } catch (err) {
      console.warn('Could not attach flip event listener:', err);
    }

    return () => {
      try {
        flipBook.off('flip', handleFlip);
        flipBook.off('changeState', handlePageTurn);
      } catch (err) {
        // Ignore cleanup errors
      }
    };
  }, [numPages]);

  // Fallback: Check current page periodically and on navigation
  useEffect(() => {
    if (!flipBookRef.current || numPages === 0 || documentLoading) return;

    const updateCurrentPage = () => {
      const flipBook = flipBookRef.current?.pageFlip();
      if (flipBook) {
        try {
          const currentIndex = flipBook.getCurrentPageIndex();
          const newPage = currentIndex + 1;
          setCurrentPage(prev => {
            // Only update if it actually changed to avoid unnecessary re-renders
            if (prev !== newPage) {
              return newPage;
            }
            return prev;
          });
        } catch (err) {
          // Ignore errors
        }
      }
    };

    // Update immediately
    updateCurrentPage();

    // Update periodically to catch any missed events
    const interval = setInterval(updateCurrentPage, 200);

    return () => clearInterval(interval);
  }, [numPages, documentLoading]);

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

      {/* Left Arrow Indicator - Outside document, positioned relative to modal */}
      {(() => {
        // Check both state and flipbook directly to ensure we show the arrow when needed
        const actualPage = getCurrentPageFromFlipbook();
        const shouldShow = pdfUrl && !error && numPages > 1 && actualPage > 1;
        return shouldShow ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handlePrevPage();
            }}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-[1003] p-3 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            style={{ 
              pointerEvents: 'auto',
              zIndex: 1003,
              display: 'flex',
              visibility: 'visible',
              opacity: 1
            }}
            title={`Previous page (${actualPage}/${numPages})`}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-8 w-8 text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }} />
          </button>
        ) : null;
      })()}
      
      {/* Right Arrow Indicator - Outside document, positioned relative to modal */}
      {(() => {
        // Check both state and flipbook directly to ensure we show the arrow when needed
        const actualPage = getCurrentPageFromFlipbook();
        const shouldShow = pdfUrl && !error && numPages > 1 && actualPage < numPages;
        return shouldShow ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleNextPage();
            }}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-[1003] p-3 transition-all hover:scale-110 active:scale-95 flex items-center justify-center pointer-events-auto"
            style={{ 
              pointerEvents: 'auto',
              zIndex: 1003
            }}
            title={`Next page (${actualPage}/${numPages})`}
            aria-label="Next page"
          >
            <ChevronRight className="h-8 w-8 text-white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }} />
          </button>
        ) : null;
      })()}

      <div
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', padding: '40px', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', lineHeight: 0, fontSize: 0 }}
      >
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {pdfUrl && !error && (
          <div className="relative" style={{ width: pageDimensions.width, height: pageDimensions.height, lineHeight: 0, fontSize: 0, backgroundColor: 'transparent', margin: 0, padding: 0, display: 'block', overflow: 'visible' }}>
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
                <div style={{ 
                  width: pageDimensions.width, 
                  height: pageDimensions.height, 
                  overflow: 'hidden', 
                  position: 'relative', 
                  lineHeight: 0, 
                  fontSize: 0, 
                  margin: 0, 
                  padding: 0, 
                  backgroundColor: 'transparent', 
                  display: 'block',
                  boxSizing: 'border-box'
                }}>
                  <HTMLFlipBook
                    ref={flipBookRef}
                    width={pageDimensions.width}
                    height={pageDimensions.height}
                    size="fixed"
                    showCover={false}
                    className="pdf-flipbook"
                    drawShadow={true}
                    maxShadowOpacity={0.5}
                    usePortrait={true}
                    flippingTime={800}
                    maxWidth={pageDimensions.width}
                    maxHeight={pageDimensions.height}
                    startPage={currentPage - 1}
                    style={{ 
                      margin: 0, 
                      padding: 0, 
                      lineHeight: 0, 
                      fontSize: 0, 
                      display: 'block', 
                      width: pageDimensions.width, 
                      height: pageDimensions.height,
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
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
                </div>
              )}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
