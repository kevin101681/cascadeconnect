import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { ensurePdfWorkerConfigured } from '../lib/pdfWorker';

interface PdfFlipViewer3DProps {
  document?: {
    url: string;
    name?: string;
  };
  pdfUrl?: string; // Alternative to document.url for backward compatibility
  isOpen: boolean;
  onClose: () => void;
}


const PdfFlipViewer3D: React.FC<PdfFlipViewer3DProps> = ({ document, isOpen, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [basePageDimensions, setBasePageDimensions] = useState({ width: 800, height: 1200 });
  const [pdfAspectRatio, setPdfAspectRatio] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const blobUrlRef = useRef<string | null>(null);

  // Calculate base dimensions that fit within viewport using PDF's actual aspect ratio
  useEffect(() => {
    if (!isOpen) return;

    const updateDimensions = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 200; // Padding for arrows and controls
      const maxWidth = viewportWidth - padding;
      const maxHeight = viewportHeight - padding;

      // Use PDF's actual aspect ratio if available, otherwise default to 2:3
      const aspectRatio = pdfAspectRatio || (2 / 3);
      
      let baseWidth = Math.min(800, maxWidth);
      let baseHeight = baseWidth / aspectRatio;

      if (baseHeight > maxHeight) {
        baseHeight = maxHeight;
        baseWidth = baseHeight * aspectRatio;
      }

      setBasePageDimensions({ 
        width: Math.round(baseWidth), 
        height: Math.round(baseHeight) 
      });
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
        ensurePdfWorkerConfigured();
        
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
          ensurePdfWorkerConfigured();
          
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

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < numPages) {
        setCurrentPage(prev => prev + 1);
      } else if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(prev + 0.25, 3));
      } else if (e.key === '-') {
        setZoom(prev => Math.max(prev - 0.25, 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, numPages]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onWheel={(e) => {
        // Prevent scroll from propagating to background
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        // Prevent touch scroll from propagating to background
        e.stopPropagation();
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

      {/* Zoom Controls */}
      <div className="fixed top-6 left-6 z-[1001] flex items-center gap-2 bg-primary/90 backdrop-blur-sm rounded-full p-2 shadow-elevation-3">
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-primary text-primary-on rounded-full transition-all hover:scale-105 active:scale-95"
          title="Zoom Out"
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <span className="text-primary-on text-sm font-medium px-2 min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-primary text-primary-on rounded-full transition-all hover:scale-105 active:scale-95"
          title="Zoom In"
          disabled={zoom >= 3}
        >
          <ZoomIn className="h-5 w-5" />
        </button>
      </div>

      {/* Page Navigation */}
      <div
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', padding: '20px', boxSizing: 'border-box' }}
      >
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {pdfUrl && !error && (
          <div className="flex items-center gap-4">
            {/* Previous Page Button */}
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className={`p-4 rounded-full shadow-elevation-3 transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${
                currentPage <= 1
                  ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 text-primary-on'
              }`}
              title="Previous Page"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>

            {/* PDF Document */}
            <div className="relative bg-white shadow-elevation-3 rounded-lg overflow-auto" style={{ maxHeight: '90vh', maxWidth: '90vw' }}>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
              loading={
                <div className="text-white flex flex-col items-center justify-center" style={{ width: basePageDimensions.width * zoom, height: basePageDimensions.height * zoom }}>
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
                  <div className="p-4">
                    <Page
                      pageNumber={currentPage}
                      width={basePageDimensions.width * zoom}
                      height={basePageDimensions.height * zoom}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                        <div className="flex items-center justify-center bg-gray-100" style={{ width: basePageDimensions.width * zoom, height: basePageDimensions.height * zoom }}>
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center bg-red-50 text-red-600" style={{ width: basePageDimensions.width * zoom, height: basePageDimensions.height * zoom }}>
                          Error loading page
                        </div>
                      }
                    />
                  </div>
                ) : documentLoading ? (
                  <div className="text-white flex flex-col items-center justify-center" style={{ width: basePageDimensions.width * zoom, height: basePageDimensions.height * zoom }}>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <p className="mt-4">Loading PDF pages...</p>
                  </div>
                ) : null}
              </Document>

              {/* Page Counter */}
              {numPages > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
                  Page {currentPage} of {numPages}
                </div>
              )}
            </div>

            {/* Next Page Button */}
            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className={`p-4 rounded-full shadow-elevation-3 transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${
                currentPage >= numPages
                  ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 text-primary-on'
              }`}
              title="Next Page"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfFlipViewer3D;
