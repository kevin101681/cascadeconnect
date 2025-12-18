import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, FileText, AlertCircle } from 'lucide-react';
import { HomeownerDocument } from '../types';

interface PDFViewerProps {
  document: HomeownerDocument;
  isOpen: boolean;
  onClose: () => void;
}

interface PDFPageCanvasProps {
  page: any;
  pageIndex: number;
  scale: number;
  rotation: number;
}

const PDFPageCanvas: React.FC<PDFPageCanvasProps> = ({ page, pageIndex, scale, rotation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && page) {
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.maxWidth = `${viewport.width}px`;
      canvas.style.transform = rotation !== 0 ? `rotate(${rotation}deg)` : 'none';

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      page.render(renderContext).promise.catch((err: any) => {
        console.error('Error rendering page:', err);
      });
    }
  }, [page, scale, rotation]);

  return (
    <div className="relative mb-4 w-full flex justify-center">
      <canvas 
        ref={canvasRef} 
        className="shadow-lg rounded-sm bg-white dark:bg-gray-800 pdf-page-canvas block" 
      />
    </div>
  );
};

const PDFViewer: React.FC<PDFViewerProps> = ({ document: doc, isOpen, onClose }) => {
  const [scale, setScale] = useState(1.5);
  const [rotation, setRotation] = useState(0);
  const [pages, setPages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const blobUrlRef = useRef<string | null>(null);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const totalPages = pages.length;

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (doc.url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For non-data URLs, try to open in new tab or download
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name;
      link.target = '_blank';
      link.click();
    }
  };

  const isPDF = doc.type === 'PDF' || doc.name.toLowerCase().endsWith('.pdf') || 
                doc.url.startsWith('data:application/pdf') || 
                doc.url.includes('pdf');

  useEffect(() => {
    if (isOpen && doc.url) {
      const loadPdf = async () => {
        setIsLoading(true);
        setError(null);
        setPages([]);
        
        // Cleanup previous blob URL if it exists
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        
        try {
          let finalUrl = doc.url;
          
          // For data URLs, create a blob URL for better compatibility with pdf.js
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
          
          // Load PDF using pdf.js (same as ReportPreviewModal)
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            throw new Error("PDF Library not loaded");
          }

          const loadingTask = pdfjsLib.getDocument(finalUrl);
          const pdf = await loadingTask.promise;
          
          const pagePromises = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            pagePromises.push(pdf.getPage(i));
          }
          const loadedPages = await Promise.all(pagePromises);
          setPages(loadedPages);
          setIsLoading(false);
        } catch (err: any) {
          console.error("PDF Load Error", err);
          setError(err.message || "Failed to load PDF");
          setIsLoading(false);
        }
      };
      
      loadPdf();
    } else {
      setPages([]);
      setPdfUrl(null);
      setIsLoading(false);
    }
    
    // Cleanup blob URL on unmount or when doc changes
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isOpen, doc.url, doc.name]);

  // Don't return null early - let the component render so useEffect can run
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]" 
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div 
        className="bg-surface dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col m-4 animate-[scale-in_0.2s_ease-out]"
        style={{ height: '95vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-outline-variant dark:border-gray-700">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-medium text-surface-on dark:text-gray-100 truncate">{doc.name}</h2>
              <p className="text-sm text-surface-on-variant dark:text-gray-400">
                Uploaded by {doc.uploadedBy} • {new Date(doc.uploadDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            {isPDF && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-sm text-surface-on-variant dark:text-gray-400 min-w-[3rem] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
                  title="Rotate"
                >
                  <RotateCw className="h-5 w-5" />
                </button>
              </>
            )}
            <button
              onClick={() => {
                if (pdfUrl) {
                  window.open(pdfUrl, '_blank');
                } else {
                  handleDownload();
                }
              }}
              className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
              title="Open in new tab"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900" style={{ minHeight: 0, height: '100%' }}>
          {error ? (
            <div className="flex flex-col items-center justify-center h-full w-full bg-surface-container dark:bg-gray-800 p-4 text-center">
              <AlertCircle size={48} className="text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors"
              >
                Download PDF
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full w-full bg-surface-container dark:bg-gray-800">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : isPDF && pages.length > 0 ? (
            <div className="p-4 flex flex-col items-center">
              {pages.map((page, index) => (
                <PDFPageCanvas 
                  key={index} 
                  page={page} 
                  pageIndex={index}
                  scale={scale}
                  rotation={rotation}
                />
              ))}
            </div>
          ) : !isPDF ? (
            <div className="text-center p-8">
              <p className="text-surface-on-variant dark:text-gray-400 mb-4">
                Preview not available for this file type. Please download to view.
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors"
              >
                Download File
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;

