import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { X } from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
        <div style={{ margin: 0, padding: 0 }}>
          <Page
            pageNumber={pageNumber}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
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
      const padding = 80;
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
      return;
    }

    const preparePdfUrl = async () => {
      try {
        setDocumentLoading(true);
        setError(null);
        setNumPages(0);
        
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
        }
        
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
    setNumPages(numPages);
    setError(null);
    setCurrentPage(1);
    
    // Get the actual PDF page dimensions to calculate aspect ratio
    try {
      if (pdfUrl && numPages > 0) {
        // Load the PDF document to get page dimensions
        const loadingTask = pdfjs.getDocument(pdfUrl);
        const pdfDoc = await loadingTask.promise;
        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        const aspectRatio = viewport.width / viewport.height;
        setPdfAspectRatio(aspectRatio);
        console.log('PDF aspect ratio:', aspectRatio, 'Dimensions:', viewport.width, 'x', viewport.height);
      }
    } catch (err) {
      console.warn('Could not get PDF dimensions, using default aspect ratio:', err);
    }
    
    setDocumentLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError(error.message || 'Failed to load PDF');
    setDocumentLoading(false);
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
        style={{ width: '100%', padding: '40px', boxSizing: 'border-box' }}
      >
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {pdfUrl && !error && (
          <div className="relative" style={{ width: pageDimensions.width, height: pageDimensions.height }}>
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
                <div style={{ width: pageDimensions.width, height: pageDimensions.height, overflow: 'hidden' }}>
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
              )}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfFlipViewer3D;
