import React, { useState, useRef } from 'react';
import { ReactPDFBookViewer } from '@jaymanyoo/pdf-book-viewer/react';
import { X, Upload } from 'lucide-react';

// Prevent react-pdf from interfering with the library's PDF.js
// The library loads its own PDF.js from CDN
if (typeof window !== 'undefined') {
  // Store original if it exists
  const originalPdfjs = (window as any).pdfjsLib;
  
  // The library will set up its own PDF.js worker
  // We just need to make sure react-pdf doesn't interfere
}

interface PdfFlipViewerProps {
  document?: {
    url: string;
    name?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

const PdfFlipViewer: React.FC<PdfFlipViewerProps> = ({ document, isOpen, onClose }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(document?.url || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<any>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setPdfUrl(result);
        } else if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
        setIsLoading(false);
      };
      reader.onerror = () => {
        console.error('Error reading PDF file');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const handleLoadStart = () => {
    console.log('PDF loading started');
    setIsLoading(true);
    setError(null);
  };

  const handleLoadComplete = () => {
    console.log('PDF loading completed');
    setIsLoading(false);
    setError(null);
  };

  const handlePageChange = (page: number, total: number) => {
    console.log('Page changed to:', page, 'of', total);
  };

  const handleError = (error: Error) => {
    console.error('PDF viewer error:', error);
    setIsLoading(false);
    setError(error.message || 'Failed to load PDF');
    console.error('Full error details:', error);
  };

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  // Check if library scripts are loaded
  React.useEffect(() => {
    const checkLibrary = () => {
      if ((window as any).pdfjsLib && (window as any).St) {
        console.log('Library scripts are loaded');
        setLibraryReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkLibrary()) {
      return;
    }

    // Poll for library to load (library loads scripts dynamically)
    const interval = setInterval(() => {
      if (checkLibrary()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!checkLibrary()) {
        console.error('Library scripts failed to load');
        setError('Failed to load PDF viewer library. Please refresh the page.');
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Reset PDF URL when document prop changes
  React.useEffect(() => {
    if (document?.url) {
      console.log('Setting PDF URL from document:', document.url);
      setPdfUrl(document.url);
    } else {
      setPdfUrl(null);
    }
  }, [document?.url]);

  // Cleanup blob URL on unmount
  React.useEffect(() => {
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Timeout to detect if loading is stuck
  React.useEffect(() => {
    if (isLoading && pdfUrl) {
      const timeout = setTimeout(() => {
        console.warn('PDF loading timeout - taking longer than expected');
        console.warn('PDF URL:', pdfUrl);
        console.warn('Library ready:', libraryReady);
        console.warn('Window pdfjsLib:', (window as any).pdfjsLib);
        console.warn('Window St:', (window as any).St);
        setError('PDF loading is taking longer than expected. The library may not be loading correctly. Please check the browser console for errors.');
        setIsLoading(false);
      }, 15000); // 15 second timeout (reduced from 30)

      return () => clearTimeout(timeout);
    }
  }, [isLoading, pdfUrl, libraryReady]);

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

      {/* File Input Button */}
      {!pdfUrl && (
        <button
          onClick={handleFileInputClick}
          className="fixed top-6 left-6 z-[1001] bg-primary hover:bg-primary/90 text-primary-on rounded-full px-4 py-3 shadow-elevation-3 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          title="Select PDF File"
          aria-label="Select PDF File"
        >
          <Upload className="h-5 w-5" />
          <span className="text-sm font-medium">Select PDF</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Select PDF file"
      />

      {/* PDF Viewer Container */}
      <div 
        className="flex items-center justify-center w-full h-full p-4 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {pdfUrl ? (
          <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden" style={{ 
            width: 'min(800px, 90vw)',
            height: 'min(600px, 90vh)',
            maxWidth: '100%',
            maxHeight: '100%'
          }}>
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10 p-4">
                <div className="text-center">
                  <p className="text-red-600 mb-4">Error: {error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      setPdfUrl(null);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-on px-4 py-2 rounded-lg"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
            {isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-surface-on-variant dark:text-gray-400">Loading PDF...</p>
                  <p className="text-xs text-surface-on-variant/60 dark:text-gray-500 mt-2">This may take a moment</p>
                </div>
              </div>
            )}
            <div className="w-full h-full" key={pdfUrl || 'no-pdf'}>
              {pdfUrl && !error && libraryReady && (
                <ReactPDFBookViewer
                  ref={viewerRef}
                  source={pdfUrl}
                  width={800}
                  height={600}
                  onLoadStart={() => {
                    console.log('ReactPDFBookViewer: onLoadStart called');
                    handleLoadStart();
                  }}
                  onLoadEnd={() => {
                    console.log('ReactPDFBookViewer: onLoadEnd called');
                    handleLoadComplete();
                  }}
                  onPageChange={(page, total) => {
                    console.log('ReactPDFBookViewer: onPageChange called', page, total);
                    handlePageChange(page, total);
                  }}
                  onError={(error) => {
                    console.error('ReactPDFBookViewer: onError called', error);
                    handleError(error);
                  }}
                  loaderText="Loading PDF..."
                  style={{ width: '100%', height: '100%' }}
                />
              )}
              {pdfUrl && !libraryReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-surface-on-variant dark:text-gray-400">Loading viewer library...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-surface dark:bg-gray-800 rounded-3xl p-8 text-center max-w-md">
            <Upload className="h-16 w-16 text-surface-on-variant dark:text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-surface-on dark:text-gray-100 mb-2">
              No PDF Selected
            </h3>
            <p className="text-surface-on-variant dark:text-gray-400 mb-6">
              Click the "Select PDF" button to choose a PDF file to view
            </p>
            <button
              onClick={handleFileInputClick}
              className="bg-primary hover:bg-primary/90 text-primary-on px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Select PDF File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfFlipViewer;

