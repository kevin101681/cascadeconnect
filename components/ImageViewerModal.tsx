import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Save, Undo, Redo, Type, Square, Circle, Minus, Pencil, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Attachment } from '../types';
import Button from './Button';

interface ImageViewerModalProps {
  isOpen: boolean;
  attachments: Attachment[];
  initialIndex: number;
  onClose: () => void;
  onUpdateAttachment?: (index: number, updatedUrl: string) => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  attachments,
  initialIndex,
  onClose,
  onUpdateAttachment
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const modalRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fabricLibRef = useRef<any>(null);
  
  // Editing state
  const [tool, setTool] = useState<'select' | 'draw' | 'arrow' | 'rect' | 'circle' | 'text'>('select');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const [color, setColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Filter to only show images
  const imageAttachments = attachments.filter(att => att.type === 'IMAGE' && att.url);
  
  // Update current index when initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      // Focus the modal for keyboard navigation
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }
  }, [isOpen, initialIndex]);

  // Keep ref in sync with state
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Load fabric.js dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;
    
    import('fabric').then((fabricModule) => {
      const fabricLib = (fabricModule as any).fabric || fabricModule.default || fabricModule;
      fabricLibRef.current = fabricLib;
      setFabricLoaded(true);
      console.log('✅ Fabric.js loaded');
    }).catch((error) => {
      console.error('❌ Failed to load fabric.js:', error);
      setImageError('Failed to load image editor library');
    });
  }, [isOpen]);

  // Helper function to calculate canvas size
  const calculateCanvasSize = () => {
    const container = canvasContainerRef.current;
    if (!container) return { width: 1000, height: 700 };
    
    const containerRect = container.getBoundingClientRect();
    const padding = 32; // 2rem = 32px (p-8)
    const maxWidth = Math.min(1200, containerRect.width - padding * 2);
    const maxHeight = containerRect.height - padding * 2;
    
    return { width: maxWidth, height: maxHeight };
  };

  // Initialize canvas after fabric is loaded
  useEffect(() => {
    if (!fabricLoaded || !fabricLibRef.current || !canvasRef.current || !isOpen) {
      return;
    }

    // Small delay to ensure canvas element is fully rendered
    const initTimeout = setTimeout(() => {
      const fabricLib = fabricLibRef.current;
      const canvasElement = canvasRef.current;
      
      if (!fabricLib || !canvasElement) return;
      
      // Check if canvas is already initialized
      if (fabricCanvasRef.current) {
        return;
      }
      
      const { width: canvasWidth, height: canvasHeight } = calculateCanvasSize();
      
      try {
      const canvas = new fabricLib.Canvas(canvasElement, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 'transparent',
      });

        fabricCanvasRef.current = canvas;
        setCanvasInitialized(true);
        console.log('✅ Canvas initialized');
      } catch (error) {
        console.error('❌ Error initializing canvas:', error);
        setImageError('Failed to initialize canvas');
      }
    }, 100);

    return () => {
      clearTimeout(initTimeout);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      setCanvasInitialized(false);
    };
  }, [fabricLoaded, isOpen]);

  // Handle window resize to recalculate canvas size
  useEffect(() => {
    if (!isOpen || !fabricCanvasRef.current) return;

    const handleResize = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      const { width: newWidth, height: newHeight } = calculateCanvasSize();
      canvas.setDimensions({ width: newWidth, height: newHeight });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Save state for undo/redo
  const saveState = React.useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const state = JSON.stringify(canvas.toJSON());
    setHistory((prev) => {
      const currentIndex = historyIndexRef.current;
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(state);
      return newHistory.slice(-20);
    });
    setHistoryIndex((prev) => {
      const newIndex = Math.min(prev + 1, 19);
      historyIndexRef.current = newIndex;
      return newIndex;
    });
  }, []);

  // Load image when current image changes
  useEffect(() => {
    if (!fabricLoaded || !canvasInitialized || !fabricCanvasRef.current || !fabricLibRef.current || !isOpen) {
      return;
    }

    const canvas = fabricCanvasRef.current;
    const fabricLib = fabricLibRef.current;
    const currentImage = imageAttachments[currentIndex];
    
    if (!currentImage?.url) return;

    setImageLoading(true);
    setImageError(null);
    setHistory([]);
    setHistoryIndex(-1);
    historyIndexRef.current = -1;

    const loadImage = async () => {
      try {
        // Clear existing background image first
        canvas.backgroundImage = null;
        canvas.renderAll();
        
        console.log('Loading image:', currentImage.url);
        
        // Load image using fabric.js v6 Promise-based API
        const img = await fabricLib.Image.fromURL(currentImage.url, {
          crossOrigin: 'anonymous'
        });
        
        console.log('Image loaded, dimensions:', img.width, img.height);
        
        // Wait for image to be fully loaded if dimensions aren't available yet
        if (!img.width || !img.height) {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Image load timeout'));
            }, 10000); // 10 second timeout
            
            img.on('loaded', () => {
              clearTimeout(timeout);
              resolve(img);
            });
            
            img.on('error', (err: any) => {
              clearTimeout(timeout);
              reject(err);
            });
          });
        }
        
        const canvasWidth = canvas.width || 1000;
        const canvasHeight = canvas.height || 700;
        const imgWidth = img.width || 1;
        const imgHeight = img.height || 1;
        
        console.log('Scaling image to canvas:', { canvasWidth, canvasHeight, imgWidth, imgHeight });
        
        // Scale to fit within canvas with some padding
        const padding = 20;
        const scale = Math.min(
          (canvasWidth - padding * 2) / imgWidth,
          (canvasHeight - padding * 2) / imgHeight
        );
        
        img.scale(scale);
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        
        // Create rounded rectangle clip path for the image
        const cornerRadius = 16; // rounded-xl = 16px
        const imgLeft = (canvasWidth - scaledWidth) / 2;
        const imgTop = (canvasHeight - scaledHeight) / 2;
        
        const clipPath = new fabricLib.Rect({
          left: imgLeft,
          top: imgTop,
          width: scaledWidth,
          height: scaledHeight,
          rx: cornerRadius,
          ry: cornerRadius,
          absolutePositioned: true,
        });
        
        img.set({
          left: imgLeft,
          top: imgTop,
          selectable: false,
          evented: false,
          clipPath: clipPath,
        });
        
        canvas.backgroundImage = img;
        canvas.renderAll();
        console.log('✅ Image loaded and displayed');
        setImageLoading(false);
        // Reset zoom and pan when new image loads
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
        saveState();
      } catch (error: any) {
        console.error('❌ Error loading image:', error);
        setImageError(error.message || 'Failed to load image');
        setImageLoading(false);
      }
    };

    loadImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, fabricLoaded, canvasInitialized, isOpen]);

  // Set up tool handlers
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const strokeWidthRef = useRef(strokeWidth);

  useEffect(() => {
    toolRef.current = tool;
    colorRef.current = color;
    strokeWidthRef.current = strokeWidth;
  }, [tool, color, strokeWidth]);

  useEffect(() => {
    if (!fabricLoaded || !canvasInitialized || !fabricCanvasRef.current || !fabricLibRef.current || !isOpen) {
      return;
    }

    const canvas = fabricCanvasRef.current;
    const fabricLib = fabricLibRef.current;
    
    if (canvas.backgroundImage) {
      canvas.backgroundImage.selectable = false;
      canvas.backgroundImage.evented = false;
    }

    let isDrawing = false;
    let path: any = null;

    const handleMouseDown = (opt: any) => {
      const currentTool = toolRef.current;
      const currentColor = colorRef.current;
      const currentStrokeWidth = strokeWidthRef.current;

      if (currentTool === 'select') {
        return;
      }

      if (currentTool === 'draw') {
        isDrawing = true;
        const pointer = canvas.getPointer(opt.e);
        path = new fabricLib.Polyline(
          [{ x: pointer.x, y: pointer.y }],
          {
            stroke: currentColor,
            strokeWidth: currentStrokeWidth,
            fill: '',
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            selectable: false,
            evented: false,
            objectCaching: false,
          }
        );
        canvas.add(path);
      } else if (currentTool === 'arrow') {
        const pointer = canvas.getPointer(opt.e);
        const startX = pointer.x;
        const startY = pointer.y;

        const handleMouseMove = (moveOpt: any) => {
          if (path) canvas.remove(path);
          const movePointer = canvas.getPointer(moveOpt.e);
          const endX = movePointer.x;
          const endY = movePointer.y;
          const dx = endX - startX;
          const dy = endY - startY;
          const angle = Math.atan2(dy, dx);
          const arrowHeadLength = 15;
          const arrowHeadAngle = Math.PI / 6;

          const arrowPath = new fabricLib.Path(
            `M ${startX} ${startY} L ${endX} ${endY} M ${endX} ${endY} L ${endX - arrowHeadLength * Math.cos(angle - arrowHeadAngle)} ${endY - arrowHeadLength * Math.sin(angle - arrowHeadAngle)} M ${endX} ${endY} L ${endX - arrowHeadLength * Math.cos(angle + arrowHeadAngle)} ${endY - arrowHeadLength * Math.sin(angle + arrowHeadAngle)}`,
            {
              stroke: currentColor,
              strokeWidth: currentStrokeWidth,
              fill: '',
              strokeLineCap: 'round',
              strokeLineJoin: 'round',
            }
          );
          path = arrowPath;
          canvas.add(path);
        };

        const handleMouseUp = () => {
          canvas.off('mouse:move', handleMouseMove);
          canvas.off('mouse:up', handleMouseUp);
          saveState();
        };

        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);
      } else if (currentTool === 'rect') {
        const pointer = canvas.getPointer(opt.e);
        const startX = pointer.x;
        const startY = pointer.y;

        const rect = new fabricLib.Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          stroke: currentColor,
          strokeWidth: currentStrokeWidth,
          fill: 'transparent',
        });
        canvas.add(rect);

        const handleMouseMove = (moveOpt: any) => {
          const movePointer = canvas.getPointer(moveOpt.e);
          rect.set({
            width: Math.abs(movePointer.x - startX),
            height: Math.abs(movePointer.y - startY),
          });
          if (movePointer.x < startX) rect.set({ left: movePointer.x });
          if (movePointer.y < startY) rect.set({ top: movePointer.y });
          canvas.renderAll();
        };

        const handleMouseUp = () => {
          canvas.off('mouse:move', handleMouseMove);
          canvas.off('mouse:up', handleMouseUp);
          saveState();
        };

        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);
      } else if (currentTool === 'circle') {
        const pointer = canvas.getPointer(opt.e);
        const startX = pointer.x;
        const startY = pointer.y;

        const circle = new fabricLib.Circle({
          left: startX,
          top: startY,
          radius: 0,
          stroke: currentColor,
          strokeWidth: currentStrokeWidth,
          fill: 'transparent',
        });
        canvas.add(circle);

        const handleMouseMove = (moveOpt: any) => {
          const movePointer = canvas.getPointer(moveOpt.e);
          const radius = Math.sqrt(
            Math.pow(movePointer.x - startX, 2) + Math.pow(movePointer.y - startY, 2)
          );
          circle.set({ radius });
          canvas.renderAll();
        };

        const handleMouseUp = () => {
          canvas.off('mouse:move', handleMouseMove);
          canvas.off('mouse:up', handleMouseUp);
          saveState();
        };

        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);
      } else if (currentTool === 'text') {
        const pointer = canvas.getPointer(opt.e);
        const text = new fabricLib.IText('Double click to edit', {
          left: pointer.x,
          top: pointer.y,
          fill: currentColor,
          fontSize: 20,
          fontFamily: 'Arial',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        saveState();
      }
    };

    const handleMouseMove = (opt: any) => {
      const currentTool = toolRef.current;
      if (currentTool === 'draw' && isDrawing && path) {
        const pointer = canvas.getPointer(opt.e);
        try {
          if (path.points && Array.isArray(path.points)) {
            path.points.push({ x: pointer.x, y: pointer.y });
            path.set({ dirty: true });
            canvas.requestRenderAll();
          }
        } catch (error) {
          console.error('Error updating draw path:', error);
          canvas.requestRenderAll();
        }
      }
    };

    const handleMouseUp = () => {
      const currentTool = toolRef.current;
      if (currentTool === 'draw' && isDrawing) {
        isDrawing = false;
        saveState();
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('object:added', saveState);
    canvas.on('object:removed', saveState);
    canvas.on('object:modified', saveState);
    
    const updateSelectionMode = () => {
      const currentTool = toolRef.current;
      canvas.selection = currentTool === 'select';
      canvas.defaultCursor = currentTool === 'select' ? 'default' : 'crosshair';
    };
    updateSelectionMode();

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('object:added', saveState);
      canvas.off('object:removed', saveState);
      canvas.off('object:modified', saveState);
    };
  }, [fabricLoaded, canvasInitialized, isOpen, saveState]);

  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    canvas.selection = tool === 'select';
    canvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair';
  }, [tool, canvasInitialized]);

  // Apply zoom and pan to canvas
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    const canvas = fabricCanvasRef.current;
    
    // Apply zoom and pan using viewport transform
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    vpt[0] = zoomLevel; // Scale X
    vpt[3] = zoomLevel; // Scale Y
    vpt[4] = panPosition.x; // Translate X
    vpt[5] = panPosition.y; // Translate Y
    canvas.setViewportTransform(vpt);
    canvas.renderAll();
  }, [zoomLevel, panPosition, canvasInitialized]);

  // Handle mouse wheel zoom
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized) return;
    const canvas = fabricCanvasRef.current;
    const canvasElement = canvas.getElement();
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.5, Math.min(5, zoomLevel + delta));
      
      // Zoom towards mouse position
      const pointer = canvas.getPointer(e);
      const zoomPoint = { x: pointer.x, y: pointer.y };
      
      const zoom = newZoom / zoomLevel;
      const newPanX = zoomPoint.x - (zoomPoint.x - panPosition.x) * zoom;
      const newPanY = zoomPoint.y - (zoomPoint.y - panPosition.y) * zoom;
      
      setZoomLevel(newZoom);
      setPanPosition({ x: newPanX, y: newPanY });
    };
    
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      canvasElement.removeEventListener('wheel', handleWheel);
    };
  }, [zoomLevel, panPosition, canvasInitialized]);

  // Handle pan with mouse drag (only when zoomed in and using select tool)
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasInitialized || tool !== 'select' || zoomLevel <= 1) return;
    const canvas = fabricCanvasRef.current;
    
    const handleMouseDown = (opt: any) => {
      // Only pan if no object is being clicked and space is pressed, or if middle mouse button
      if (opt.e.button === 1 || (opt.e.button === 0 && opt.e.shiftKey)) {
        setIsPanning(true);
        setPanStart({ x: opt.e.clientX - panPosition.x, y: opt.e.clientY - panPosition.y });
        opt.e.preventDefault();
      }
    };
    
    const handleMouseMove = (opt: any) => {
      if (isPanning) {
        setPanPosition({
          x: opt.e.clientX - panStart.x,
          y: opt.e.clientY - panStart.y
        });
        opt.e.preventDefault();
      }
    };
    
    const handleMouseUp = () => {
      setIsPanning(false);
    };
    
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [zoomLevel, panPosition, isPanning, panStart, tool, canvasInitialized]);

  const handleZoomIn = () => {
    if (!fabricCanvasRef.current) return;
    const { width: canvasWidth, height: canvasHeight } = calculateCanvasSize();
    
    // Center point of the canvas
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    const newZoom = Math.min(5, zoomLevel + 0.25);
    const zoom = newZoom / zoomLevel;
    
    // Adjust pan to keep center point fixed
    const newPanX = centerX - (centerX - panPosition.x) * zoom;
    const newPanY = centerY - (centerY - panPosition.y) * zoom;
    
    setZoomLevel(newZoom);
    setPanPosition({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    if (!fabricCanvasRef.current) return;
    const { width: canvasWidth, height: canvasHeight } = calculateCanvasSize();
    
    // Center point of the canvas
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    const newZoom = Math.max(0.5, zoomLevel - 0.25);
    const zoom = newZoom / zoomLevel;
    
    // Adjust pan to keep center point fixed
    const newPanX = centerX - (centerX - panPosition.x) * zoom;
    const newPanY = centerY - (centerY - panPosition.y) * zoom;
    
    setZoomLevel(newZoom);
    setPanPosition({ x: newPanX, y: newPanY });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  if (!isOpen || imageAttachments.length === 0) return null;

  const currentImage = imageAttachments[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < imageAttachments.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && hasPrevious) {
      handlePrevious();
    } else if (e.key === 'ArrowRight' && hasNext) {
      handleNext();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0 && fabricCanvasRef.current) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
        fabricCanvasRef.current?.renderAll();
      });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && fabricCanvasRef.current) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
        fabricCanvasRef.current?.renderAll();
      });
    }
  };

  const handleSave = () => {
    if (fabricCanvasRef.current && onUpdateAttachment) {
      const dataUrl = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
      });
      const originalIndex = attachments.findIndex(att => att.url === currentImage.url);
      if (originalIndex !== -1) {
        onUpdateAttachment(originalIndex, dataUrl);
      }
    }
  };

  const handleDownload = () => {
    if (fabricCanvasRef.current) {
      const dataUrl = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
      });
      const link = document.createElement('a');
      link.download = `edited-${currentImage.name || 'image'}`;
      link.href = dataUrl;
      link.click();
    }
  };

  if (!isOpen || imageAttachments.length === 0) return null;

  return createPortal(
    <div
      ref={modalRef}
      className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="relative bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-5 max-w-7xl max-h-[90vh] w-full mx-4 overflow-hidden animate-[scale-in_0.2s_ease-out] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-outline-variant dark:border-gray-700">
          <div className="flex items-center gap-4">
            <span className="text-sm text-surface-on-variant dark:text-gray-400">
              {currentIndex + 1} of {imageAttachments.length}
            </span>
            <span className="text-sm font-medium text-surface-on dark:text-gray-100">
              {currentImage.name || 'Image'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on dark:text-gray-100 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        {fabricLoaded && (
          <div className="flex items-center justify-center gap-2 p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/50 dark:bg-gray-700/50">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setTool('select'); }}
                className={`p-2 rounded-lg transition-colors ${
                  tool === 'select'
                    ? 'bg-primary text-primary-on'
                    : 'hover:bg-surface-container dark:hover:bg-gray-600'
                }`}
                title="Select"
              >
                <Minus className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTool('draw'); }}
                className={`p-2 rounded-lg transition-colors ${
                  tool === 'draw'
                    ? 'bg-primary text-primary-on'
                    : 'hover:bg-surface-container dark:hover:bg-gray-600'
                }`}
                title="Draw"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTool('arrow'); }}
                className={`p-2 rounded-lg transition-colors ${
                  tool === 'arrow'
                    ? 'bg-primary text-primary-on'
                    : 'hover:bg-surface-container dark:hover:bg-gray-600'
                }`}
                title="Arrow"
              >
                <Minus className="h-5 w-5 rotate-45" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTool('rect'); }}
                className={`p-2 rounded-lg transition-colors ${
                  tool === 'rect'
                    ? 'bg-primary text-primary-on'
                    : 'hover:bg-surface-container dark:hover:bg-gray-600'
                }`}
                title="Rectangle"
              >
                <Square className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTool('circle'); }}
                className={`p-2 rounded-lg transition-colors ${
                  tool === 'circle'
                    ? 'bg-primary text-primary-on'
                    : 'hover:bg-surface-container dark:hover:bg-gray-600'
                }`}
                title="Circle"
              >
                <Circle className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setTool('text'); }}
                className={`p-2 rounded-lg transition-colors ${
                  tool === 'text'
                    ? 'bg-primary text-primary-on'
                    : 'hover:bg-surface-container dark:hover:bg-gray-600'
                }`}
                title="Text"
              >
                <Type className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mx-4">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
                title="Color"
              />
              <input
                type="range"
                min="1"
                max="10"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-24"
                title="Stroke Width"
              />
              <span className="text-sm text-surface-on-variant dark:text-gray-400">
                {strokeWidth}px
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo"
              >
                <Undo className="h-5 w-5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo"
              >
                <Redo className="h-5 w-5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-600"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 border-l border-surface-outline-variant dark:border-gray-600 pl-2 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-600"
                title="Zoom Out"
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-sm text-surface-on-variant dark:text-gray-400 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-600"
                title="Zoom In"
                disabled={zoomLevel >= 5}
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-600"
                title="Reset Zoom"
                disabled={zoomLevel === 1 && panPosition.x === 0 && panPosition.y === 0}
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Canvas Container */}
        <div ref={canvasContainerRef} className="relative flex-1 overflow-hidden min-h-[400px]">
          {/* Previous Button */}
          {hasPrevious && (
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-surface/90 dark:bg-gray-800/90 hover:bg-surface dark:hover:bg-gray-700 text-surface-on dark:text-gray-100 shadow-elevation-2 transition-all z-10"
              title="Previous Image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Canvas */}
          <div className="flex items-center justify-center p-8 h-full relative overflow-hidden">
            {/* Always render canvas so ref exists */}
            <canvas
              ref={canvasRef}
              className="shadow-lg"
              style={{ 
                display: fabricLoaded && canvasInitialized ? 'block' : 'none',
                cursor: isPanning ? 'grabbing' : (zoomLevel > 1 && tool === 'select' ? 'grab' : 'default')
              }}
            />
            {(!fabricLoaded || !canvasInitialized) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-surface-on-variant dark:text-gray-400">Loading editor...</div>
              </div>
            )}
            {imageLoading && fabricLoaded && canvasInitialized && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
                <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 shadow-lg">
                  <p className="text-surface-on dark:text-gray-100">Loading image...</p>
                </div>
              </div>
            )}
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
                <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 shadow-lg max-w-md">
                  <p className="text-error dark:text-red-400 mb-2">Error loading image</p>
                  <p className="text-surface-on-variant dark:text-gray-400 text-sm">{imageError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Next Button */}
          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-surface/90 dark:bg-gray-800/90 hover:bg-surface dark:hover:bg-gray-700 text-surface-on dark:text-gray-100 shadow-elevation-2 transition-all z-10"
              title="Next Image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-outline-variant dark:border-gray-700 flex items-center justify-between">
          {/* Navigation Dots - Centered */}
          {imageAttachments.length > 1 && (
            <div className="flex gap-1 absolute left-1/2 -translate-x-1/2">
              {imageAttachments.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'bg-primary w-8'
                      : 'bg-surface-outline-variant dark:bg-gray-600 hover:bg-surface-outline dark:hover:bg-gray-500 w-2'
                  }`}
                  title={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}
          
          {/* Save Button */}
          <div className="ml-auto">
            <Button 
              variant="filled" 
              onClick={handleSave} 
              icon={<Save className="h-4 w-4" />}
              disabled={!fabricCanvasRef.current || !onUpdateAttachment}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageViewerModal;
