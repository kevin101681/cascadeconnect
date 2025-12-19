import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFThumbnailProps {
  url: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
}

const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ url, className = '', style = {}, onError }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!url) return;

    const preparePdfUrl = async () => {
      try {
        let finalUrl = url;

        // Convert data URL to blob URL for better compatibility
        if (url.startsWith('data:')) {
          const base64Data = url.split(',')[1];
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
            throw new Error('Invalid PDF data');
          }

          const blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = blobUrl;
          finalUrl = blobUrl;
        }

        setPdfUrl(finalUrl);
      } catch (err) {
        console.error('PDF thumbnail preparation error:', err);
        setError(true);
        if (onError) onError();
      }
    };

    preparePdfUrl();

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [url, onError]);

  const onDocumentLoadSuccess = async (pdf: any) => {
    try {
      if (!canvasRef.current) return;

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('PDF thumbnail render error:', err);
      setError(true);
      if (onError) onError();
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF thumbnail load error:', error);
    setError(true);
    if (onError) onError();
  };

  if (error || !pdfUrl) {
    // Fallback to iframe if thumbnail generation fails
    return (
      <iframe
        src={url + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=1'}
        className={className}
        style={{ border: 0, ...style }}
        title="PDF thumbnail"
        scrolling="no"
      />
    );
  }

  return (
    <Document
      file={pdfUrl}
      onLoadSuccess={onDocumentLoadSuccess}
      onLoadError={onDocumentLoadError}
      loading={
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
          <div className="text-xs text-gray-500">Loading...</div>
        </div>
      }
    >
      <div className="w-full h-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className={className}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', ...style }}
        />
      </div>
    </Document>
  );
};

export default PDFThumbnail;
