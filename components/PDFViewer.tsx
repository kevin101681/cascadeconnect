import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, FileText, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo, useAnimationControls } from 'framer-motion';
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

interface PDFPageCanvasProps {
  page: any;
  pageIndex: number;
  scale: number;
  rotation: number;
  className?: string;
  style?: React.CSSProperties;
}

const PDFPageCanvas: React.FC<PDFPageCanvasProps> = ({ page, pageIndex, scale, rotation, className = '', style }) => {
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
    <div className={`relative mb-4 w-full flex justify-center ${className}`} style={style}>
      <canvas 
        ref={canvasRef} 
        className="shadow-lg rounded-sm bg-white dark:bg-gray-800 pdf-page-canvas block" 
      />
    </div>
  );
};

interface PageFlipProps {
  currentPage: any;
  nextPage: any | null;
  previousPage: any | null;
  currentPageIndex: number;
  scale: number;
  rotation: number;
  onPageChange: (newIndex: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

const PageFlip: React.FC<PageFlipProps> = ({ 
  currentPage, 
  nextPage,
  previousPage,
  currentPageIndex, 
  scale, 
  rotation,
  onPageChange,
  canGoNext,
  canGoPrevious
}) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'previous' | null>(null);
  const controls = useAnimationControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  
  // Motion values for drag
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  
  // Calculate page dimensions for drag constraints
  const [pageWidth, setPageWidth] = useState(800); // Default fallback
  
  useEffect(() => {
    const updateDimensions = () => {
      if (pageRef.current) {
        const rect = pageRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setPageWidth(rect.width);
        }
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [currentPage, scale]);

  // Transform functions for 3D page flip - using percentage for better responsiveness
  const progress = useTransform(dragX, [-pageWidth, 0, pageWidth], [-1, 0, 1]);
  const rotateY = useTransform(progress, [-1, 0, 1], [-180, 0, 180]);
  
  // Calculate flip progress (0 to 1) for shadows and effects
  const flipProgress = useTransform(progress, [-1, 0, 1], [1, 0, 1]);
  
  // Shadow and opacity based on flip progress
  const shadowIntensity = useTransform(flipProgress, [0, 0.5, 1], [0.2, 0.8, 0.2]);
  const pageOpacity = useTransform(flipProgress, [0, 0.3, 0.7, 1], [1, 0.95, 0.7, 0.3]);
  
  // Gradient position based on drag direction
  const gradientPosition = useTransform(
    progress,
    [-1, 0, 1],
    ['0%', '50%', '100%']
  );
  
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = pageWidth * 0.25; // 25% of page width to trigger flip
    const velocity = Math.abs(info.velocity.x);
    
    // Determine if we should flip based on drag distance or velocity
    if (Math.abs(info.offset.x) > threshold || velocity > 400) {
      if (info.offset.x > 0 && canGoPrevious) {
        // Flip to previous page
        setFlipDirection('previous');
        setIsFlipping(true);
        controls.start({
          x: pageWidth,
          transition: {
            duration: 0.6,
            ease: [0.34, 1.56, 0.64, 1], // cubic-bezier for natural snap
          }
        }).then(() => {
          onPageChange(currentPageIndex - 1);
          dragX.set(0);
          dragY.set(0);
          setIsFlipping(false);
          setFlipDirection(null);
          controls.set({ x: 0 });
        });
        return;
      } else if (info.offset.x < 0 && canGoNext) {
        // Flip to next page
        setFlipDirection('next');
        setIsFlipping(true);
        controls.start({
          x: -pageWidth,
          transition: {
            duration: 0.6,
            ease: [0.34, 1.56, 0.64, 1], // cubic-bezier for natural snap
          }
        }).then(() => {
          onPageChange(currentPageIndex + 1);
          dragX.set(0);
          dragY.set(0);
          setIsFlipping(false);
          setFlipDirection(null);
          controls.set({ x: 0 });
        });
        return;
      }
    }
    
    // Snap back to center
    controls.start({
      x: 0,
      transition: {
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1],
      }
    });
    dragX.set(0);
    dragY.set(0);
  };

  const handleAnimatedFlip = (direction: 'next' | 'previous') => {
    if (isFlipping) return;
    if (direction === 'next' && !canGoNext) return;
    if (direction === 'previous' && !canGoPrevious) return;
    
    setFlipDirection(direction);
    setIsFlipping(true);
    
    const targetX = direction === 'next' ? -pageWidth : pageWidth;
    
    controls.start({
      x: targetX,
      transition: {
        duration: 0.6,
        ease: [0.34, 1.56, 0.64, 1], // cubic-bezier for natural snap
      }
    }).then(() => {
      onPageChange(direction === 'next' ? currentPageIndex + 1 : currentPageIndex - 1);
      dragX.set(0);
      dragY.set(0);
      setIsFlipping(false);
      setFlipDirection(null);
      controls.set({ x: 0 });
    });
  };

  // Expose flip function for button clicks
  useEffect(() => {
    (window as any).__pdfPageFlip = {
      flipNext: () => handleAnimatedFlip('next'),
      flipPrevious: () => handleAnimatedFlip('previous'),
    };
    return () => {
      delete (window as any).__pdfPageFlip;
    };
  }, [canGoNext, canGoPrevious, isFlipping, currentPageIndex, pageWidth]);

  // Determine which page to show underneath based on flip direction
  const underlyingPage = flipDirection === 'next' && nextPage 
    ? nextPage 
    : flipDirection === 'previous' && previousPage
    ? previousPage
    : nextPage || previousPage;

  return (
    <div 
      ref={containerRef}
      className="relative w-full flex justify-center"
      style={{ 
        perspective: '2000px',
        perspectiveOrigin: 'center center',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Underlying page (pre-rendered for smooth transition) */}
      {underlyingPage && (
        <div 
          className="absolute flex justify-center w-full"
          style={{ 
            zIndex: 0,
          }}
        >
          <PDFPageCanvas
            page={underlyingPage}
            pageIndex={flipDirection === 'next' 
              ? currentPageIndex + 1 
              : flipDirection === 'previous'
              ? currentPageIndex - 1
              : nextPage ? currentPageIndex + 1 : currentPageIndex - 1}
            scale={scale}
            rotation={rotation}
            style={{ opacity: 0.95 }}
          />
        </div>
      )}
      
      {/* Current page (flippable) */}
      <motion.div
        ref={pageRef}
        className="relative z-10 cursor-grab active:cursor-grabbing"
        style={{
          x: dragX,
          rotateY: rotateY,
          opacity: pageOpacity,
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }}
        animate={controls}
        drag="x"
        dragConstraints={{ 
          left: canGoPrevious ? -pageWidth : 0, 
          right: canGoNext ? pageWidth : 0 
        }}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        whileDrag={{ 
          cursor: 'grabbing',
        }}
        dragDirectionLock
        dragMomentum={false}
      >
        <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
          {/* Shadow on the turning edge - right side when flipping left (next) */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-sm"
            style={{
              background: 'linear-gradient(to right, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5) 85%, rgba(0,0,0,0.8) 95%, rgba(0,0,0,1) 100%)',
              opacity: useTransform(progress, [-1, -0.3, 0], [0, 0.4, 0]),
            }}
          />
          
          {/* Shadow on the turning edge - left side when flipping right (previous) */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-sm"
            style={{
              background: 'linear-gradient(to left, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5) 85%, rgba(0,0,0,0.8) 95%, rgba(0,0,0,1) 100%)',
              opacity: useTransform(progress, [0, 0.3, 1], [0, 0.4, 0]),
            }}
          />
          
          {/* Gradient overlay for depth effect - right side when flipping left */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-sm"
            style={{
              background: 'linear-gradient(to right, transparent 60%, rgba(255,255,255,0.4) 75%, rgba(0,0,0,0.3) 90%, transparent 100%)',
              opacity: useTransform(progress, [-1, -0.2, 0], [0, 0.7, 0]),
              mixBlendMode: 'overlay' as const,
            }}
          />
          
          {/* Gradient overlay for depth effect - left side when flipping right */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-sm"
            style={{
              background: 'linear-gradient(to left, transparent 60%, rgba(255,255,255,0.4) 75%, rgba(0,0,0,0.3) 90%, transparent 100%)',
              opacity: useTransform(progress, [0, 0.2, 1], [0, 0.7, 0]),
              mixBlendMode: 'overlay' as const,
            }}
          />
          
          <PDFPageCanvas
            page={currentPage}
            pageIndex={currentPageIndex}
            scale={scale}
            rotation={rotation}
          />
        </div>
      </motion.div>
    </div>
  );
};

const PDFViewer: React.FC<PDFViewerProps> = ({ document: doc, isOpen, onClose }) => {
  const [scale, setScale] = useState(1.5);
  const [rotation, setRotation] = useState(0);
  const [pages, setPages] = useState<any[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const blobUrlRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // Cleanup blob URL only when component closes or unmounts
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      blobRef.current = null;
    };
  }, []);

  // Cleanup blob URL when modal closes
  useEffect(() => {
    if (!isOpen && blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
      blobRef.current = null;
    }
  }, [isOpen]);

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
  
  const handlePreviousPage = () => {
    if (currentPageIndex > 0 && (window as any).__pdfPageFlip?.flipPrevious) {
      (window as any).__pdfPageFlip.flipPrevious();
    } else if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1 && (window as any).__pdfPageFlip?.flipNext) {
      (window as any).__pdfPageFlip.flipNext();
    } else if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };
  
  const handlePageChange = (newIndex: number) => {
    setCurrentPageIndex(newIndex);
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
        
        // Cleanup previous blob URL if it exists (but keep blob for potential reuse)
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        blobRef.current = null;
        
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
            
            // Store blob in ref to prevent garbage collection
            blobRef.current = blob;
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
          setCurrentPageIndex(0);
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
            {isPDF && pages.length > 0 && (
              <>
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPageIndex === 0}
                  className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-surface-on-variant dark:text-gray-400 min-w-[4rem] text-center">
                  {currentPageIndex + 1} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPageIndex === pages.length - 1}
                  className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="w-px h-6 bg-surface-outline-variant dark:bg-gray-600 mx-1" />
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
            <div className="p-4 flex flex-col items-center relative" style={{ minHeight: '100%' }}>
              <PageFlip
                currentPage={pages[currentPageIndex]}
                nextPage={currentPageIndex < pages.length - 1 ? pages[currentPageIndex + 1] : null}
                previousPage={currentPageIndex > 0 ? pages[currentPageIndex - 1] : null}
                currentPageIndex={currentPageIndex}
                scale={scale}
                rotation={rotation}
                onPageChange={handlePageChange}
                canGoNext={currentPageIndex < pages.length - 1}
                canGoPrevious={currentPageIndex > 0}
              />
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

