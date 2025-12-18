import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, FileText } from 'lucide-react';
import { HomeownerDocument } from '../types';

interface PDFViewerProps {
  document: HomeownerDocument;
  isOpen: boolean;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ document: doc, isOpen, onClose }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
      console.log('PDFViewer rendering:', doc.name, 'isOpen:', isOpen, 'url type:', doc.url.substring(0, 20));
      setIsLoading(true);
      setError(null);
      
      // Cleanup previous blob URL if it exists
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      
      // For data URLs, create a blob URL for better compatibility
      if (doc.url.startsWith('data:')) {
        try {
          // Extract the base64 part (everything after the comma)
          const base64Data = doc.url.split(',')[1];
          if (!base64Data) {
            console.error('Invalid data URL format - no base64 data found');
            setError('Invalid PDF data format');
            setIsLoading(false);
            return;
          }
          
          console.log('Converting data URL to blob, base64 length:', base64Data.length);
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          console.log('Created blob, size:', blob.size, 'type:', blob.type);
          
          if (blob.size === 0) {
            console.error('Blob size is 0 - invalid PDF data');
            setError('Invalid PDF data - file appears to be empty');
            setIsLoading(false);
            return;
          }
          
          const blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = blobUrl;
          console.log('Created blob URL:', blobUrl.substring(0, 50), 'for document:', doc.name);
          setPdfUrl(blobUrl);
          setIsLoading(false);
        } catch (err) {
          console.error('Error creating blob URL:', err);
          setError(`Failed to process PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setIsLoading(false);
        }
      } else {
        // For non-data URLs, use directly
        console.log('Using non-data URL directly:', doc.url.substring(0, 100));
        setPdfUrl(doc.url);
        setIsLoading(false);
      }
    } else {
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
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
              title="Download"
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
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center" style={{ minHeight: 0, height: '100%' }}>
          {error ? (
            <div className="text-center p-8">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Download Instead
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center p-8">
              <p className="text-surface-on-variant dark:text-gray-400">Loading PDF...</p>
            </div>
          ) : isPDF ? (
            doc.url && doc.url !== '#' && pdfUrl ? (
              <div 
                className="bg-white dark:bg-gray-800 shadow-lg w-full h-full flex items-center justify-center overflow-auto relative"
                style={{ minHeight: '600px' }}
              >
                <div
                  style={{
                    transform: scale !== 1 || rotation !== 0 ? `scale(${scale}) rotate(${rotation}deg)` : 'none',
                    transformOrigin: 'center',
                    transition: 'transform 0.2s ease',
                    width: '100%',
                    height: '100%',
                    minHeight: '600px',
                    position: 'relative'
                  }}
                >
                  <object
                    key={pdfUrl}
                    data={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                    style={{
                      minHeight: '600px',
                      display: 'block',
                      border: 'none'
                    }}
                    onError={() => {
                      console.error('PDF object failed to load, trying iframe fallback');
                    }}
                  >
                    <iframe
                      src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      width="100%"
                      height="100%"
                      className="border-0"
                      title={doc.name}
                      style={{
                        minHeight: '600px',
                        display: 'block'
                      }}
                      onError={() => {
                        console.error('PDF iframe fallback also failed to load');
                        setError('Failed to load PDF. Please try downloading instead.');
                      }}
                      onLoad={() => {
                        console.log('PDF iframe fallback loaded successfully');
                        setIsLoading(false);
                      }}
                    />
                    <p className="text-center p-8 text-surface-on-variant dark:text-gray-400">
                      Your browser does not support PDF viewing. 
                      <button
                        onClick={handleDownload}
                        className="ml-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Download PDF
                      </button>
                    </p>
                  </object>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-surface-on-variant dark:text-gray-400 mb-4">
                  PDF file not available. This is a placeholder document.
                </p>
                <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
                  In a real application, this would display the uploaded PDF file.
                </p>
              </div>
            )
          ) : (
            <div className="text-center p-8">
              <p className="text-surface-on-variant dark:text-gray-400 mb-4">
                Preview not available for this file type. Please download to view.
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;

