import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { X } from 'lucide-react';
// Import centralized PDF worker setup
import '../lib/pdfWorker';

interface PdfFlipViewer3DProps {
  document?: {
    url: string;
    name?: string;
  };
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
      className="pdf-page-3d" 
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
        overflow: 'hidden'
      }}
    >
      <div style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        backgroundColor: '#fff',
        margin: 0,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ margin: 0, padding: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Page
            pageNumber={pageNumber}
            width={width}
            height={height}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
                Loading page...
              </div>
            }
            error={
              <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee', color: '#c00' }}>
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

const PdfFlipViewer3D: React.FC<PdfFlipViewer3DProps> = ({ document, isOpen, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 800, height: 1200 });
  const [pdfAspectRatio, setPdfAspectRatio] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const flipBookRef = useRef<any>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Calculate dimensions that fit within viewport using PDF's actual aspect ratio
  useEffect(() => {
    if (!isOpen) return;

    const updateDimensions = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      // Reduced padding to allow more space for page flip animation
      const padding = 120; // Increased to account for animation overflow
      const maxWidth = viewportWidth - padding;
      const maxHeight = viewportHeight - padding;

      // Use PDF's actual aspect ratio if available, otherwise default to 2:3
      const aspectRatio = pdfAspectRatio || (2 / 3);
      
      let width = Math.min(800, maxWidth);
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      setPageDimensions({ width: Math.round(width), height: Math.round(height) });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isOpen, pdfAspectRatio]);

  useEffect(() => {
    if (!isOpen || !document?.url) {
      setPdfUrl(null);
      setNumPages(0);
      setDocumentLoading(false);
      setError(null);
      setPdfAspectRatio(null);
      return;
    }

    const preparePdfUrl = async () => {
      try {
        setDocumentLoading(true);
        setError(null);
        setNumPages(0);
        setPdfAspectRatio(null);
        
        // Ensure worker is configured before preparing PDF
        const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        if (!pdfjs.GlobalWorkerOptions.workerSrc || 
            pdfjs.GlobalWorkerOptions.workerSrc.includes('fake') ||
            pdfjs.GlobalWorkerOptions.workerSrc.includes('pdf.worker.mjs') ||
            !pdfjs.GlobalWorkerOptions.workerSrc.startsWith('http')) {
          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
          console.log('PDF worker configured in PdfFlipViewer3D:', workerUrl);
        }
        
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        
        let finalUrl = document.url;
        
        // Convert data URL to blob URL for better compatibility
        if (document.url.startsWith('data:')) {
          const base64Data = document.url.split(',')[1];
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
          console.log('PDF converted to blob URL, size:', blob.size);
        }
        
        console.log('Setting PDF URL for viewer');
        setPdfUrl(finalUrl);
      } catch (err: any) {
        console.error('PDF preparation error:', err);
        setError(err.message || 'Failed to prepare PDF');
        setDocumentLoading(false);
      }
    };
    
    preparePdfUrl();
    
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isOpen, document?.url]);

  const onDocumentLoadSuccess = async ({ numPages }: { numPages: number }) => {
    console.log('PDF document loaded successfully, pages:', numPages, 'pdfUrl:', pdfUrl?.substring(0, 50));
    setNumPages(numPages);
    setError(null);
    setCurrentPage(1);
    
    // Use default aspect ratio immediately so pages can render
    if (!pdfAspectRatio) {
      setPdfAspectRatio(2 / 3);
    }
    
    setDocumentLoading(false);
    
    // Get the actual PDF page dimensions to calculate aspect ratio
    // Do this asynchronously so it doesn't block rendering
    if (pdfUrl && numPages > 0) {
      (async () => {
        try {
          // Ensure worker is set before loading
          const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
          if (!pdfjs.GlobalWorkerOptions.workerSrc || 
              pdfjs.GlobalWorkerOptions.workerSrc.includes('fake') ||
              pdfjs.GlobalWorkerOptions.workerSrc.includes('pdf.worker.mjs') ||
              !pdfjs.GlobalWorkerOptions.workerSrc.startsWith('http')) {
            pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
          }
          
          // Load the PDF document to get page dimensions
          const loadingTask = pdfjs.getDocument(pdfUrl);
          const pdfDoc = await loadingTask.promise;
          const firstPage = await pdfDoc.getPage(1);
          const viewport = firstPage.getViewport({ scale: 1.0 });
          const aspectRatio = viewport.width / viewport.height;
          setPdfAspectRatio(aspectRatio);
          console.log('PDF aspect ratio calculated:', aspectRatio, 'Dimensions:', viewport.width, 'x', viewport.height);
        } catch (err) {
          console.warn('Could not get PDF dimensions, using default aspect ratio:', err);
          // Use default aspect ratio if we can't get dimensions
          setPdfAspectRatio(2 / 3);
        }
      })();
    } else {
      // Use default aspect ratio if no pages
      setPdfAspectRatio(2 / 3);
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      workerSrc: pdfjs.GlobalWorkerOptions.workerSrc
    });
    setError(error.message || 'Failed to load PDF');
    setDocumentLoading(false);
    setNumPages(0);
  };

  // Listen for page changes from the flipbook
  useEffect(() => {
    if (!flipBookRef.current || numPages === 0) return;

    const flipBook = flipBookRef.current.pageFlip();
    if (!flipBook) return;

    const handleFlip = (e: any) => {
      let newPageIndex = 0;
      if (e?.data !== undefined && e.data !== null) {
        newPageIndex = e.data;
      } else if (e?.target) {
        newPageIndex = e.target;
      } else {
        newPageIndex = flipBook.getCurrentPageIndex();
      }
      const newPage = newPageIndex + 1;
      setCurrentPage(newPage);
    };

    try {
      flipBook.on('flip', handleFlip);
    } catch (err) {
      console.warn('Could not attach flip event listener:', err);
    }

    return () => {
      try {
        flipBook.off('flip', handleFlip);
      } catch (err) {
        // Ignore cleanup errors
      }
    };
  }, [numPages]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Close Button */}
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
        style={{ width: '100%', padding: '20px', boxSizing: 'border-box', overflow: 'visible' }}
      >
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {pdfUrl && !error && (
          <div className="relative" style={{ width: pageDimensions.width, height: pageDimensions.height, overflow: 'visible' }}>
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="text-white flex flex-col items-center justify-center" style={{ width: pageDimensions.width, height: pageDimensions.height }}>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  <p className="mt-4">Loading PDF...</p>
                </div>
              }
              error={
                <div className="text-white p-4">
                  <p>Error loading PDF. Please try again.</p>
                </div>
              }
            >
              {numPages > 0 ? (
                <div style={{ width: pageDimensions.width, height: pageDimensions.height, overflow: 'visible', position: 'relative', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <HTMLFlipBook
                    ref={flipBookRef}
                    width={pageDimensions.width}
                    height={pageDimensions.height}
                    size="fixed"
                    showCover={false}
                    className="pdf-flipbook-3d"
                    drawShadow={true}
                    maxShadowOpacity={0.5}
                    usePortrait={true}
                    flippingTime={800}
                    maxWidth={pageDimensions.width}
                    maxHeight={pageDimensions.height}
                    startPage={currentPage - 1}
                    style={{ margin: 0, padding: 0 }}
                    minWidth={0}
                    minHeight={0}
                    startZIndex={0}
                    autoSize={false}
                    showPageCorners={true}
                    swipeDistance={30}
                    clickEventForward={true}
                    useMouseEvents={true}
                    disableFlipByClick={false}
                    mobileScrollSupport={true}
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
              ) : documentLoading ? (
                <div className="text-white flex flex-col items-center justify-center" style={{ width: pageDimensions.width, height: pageDimensions.height }}>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  <p className="mt-4">Loading PDF pages...</p>
                </div>
              ) : null}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfFlipViewer3D;
