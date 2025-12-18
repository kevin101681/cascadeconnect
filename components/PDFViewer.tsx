import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { HomeownerDocument } from '../types';

// Set up PDF.js worker - import worker using Vite's ?url syntax
// @ts-ignore - Vite handles ?url imports
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

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
        backgroundColor: '#fff'
      }}
    >
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
  );
});

PDFPage.displayName = 'PDFPage';

const PDFViewer: React.FC<PDFViewerProps> = ({ document: doc, isOpen, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const flipBookRef = useRef<any>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Fixed dimensions for smooth page flip animation
  const PAGE_WIDTH = 800;
  const PAGE_HEIGHT = 1200;

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
  };

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
      <div
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', height: '100%' }}
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
              <HTMLFlipBook
                ref={flipBookRef}
                width={PAGE_WIDTH}
                height={PAGE_HEIGHT}
                size="fixed"
                showCover={false}
                className="pdf-flipbook"
                {...({} as any)}
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <PDFPage
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={PAGE_WIDTH}
                    height={PAGE_HEIGHT}
                  />
                ))}
              </HTMLFlipBook>
            )}
          </Document>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
