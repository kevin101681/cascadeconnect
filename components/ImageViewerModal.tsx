import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Save, Undo, Redo, Type, Square, Circle, Minus, Pencil, Download } from 'lucide-react';
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
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);

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
      const fabricLib = (fabricModule as any).fabric || fabricModule;
      fabricLibRef.current = fabricLib;
      setFabricLoaded(true);
    });
  }, [isOpen]);

  // Initialize canvas after fabric is loaded
  useEffect(() => {
    if (!fabricLoaded || !fabricLibRef.current || !canvasRef.current || !isOpen) {
      return;
    }

    const fabricLib = fabricLibRef.current;
    const canvas = new fabricLib.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    });

    fabricCanvasRef.current = canvas;
    setCanvasInitialized(true);

    return () => {
      if (canvas) {
        canvas.dispose();
      }
      setCanvasInitialized(false);
    };
  }, [fabricLoaded, isOpen]);

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
        const img = await fabricLib.Image.fromURL(currentImage.url);
        const scale = Math.min(
          (canvas.width! - 40) / img.width!,
          (canvas.height! - 40) / img.height!
        );
        
        img.scale(scale);
        const scaledWidth = img.width! * scale;
        const scaledHeight = img.height! * scale;
        img.set({
          left: (canvas.width! - scaledWidth) / 2,
          top: (canvas.height! - scaledHeight) / 2,
          selectable: false,
          evented: false,
        });
        
        canvas.backgroundImage = img;
        canvas.renderAll();
        setImageLoading(false);
        saveState();
      } catch (error: any) {
        console.error('Error loading image:', error);
        setImageError(error.message || 'Failed to load image');
        setImageLoading(false);
      }
    };

    loadImage();
  }, [currentIndex, fabricLoaded, canvasInitialized, isOpen, imageAttachments, saveState]);

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

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
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
          <div className="flex items-center gap-2 p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/50 dark:bg-gray-700/50">
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

            <div className="flex-1" />

            <div className="flex items-center gap-2">
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

            <div className="flex items-center gap-2 ml-4">
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
          </div>
        )}

        {/* Canvas Container */}
        <div className="relative flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 min-h-[400px]">
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
          <div className="flex items-center justify-center p-8 h-full">
            {fabricLoaded && canvasInitialized ? (
              <canvas ref={canvasRef} className="border border-surface-outline-variant dark:border-gray-700 shadow-lg bg-white" />
            ) : (
              <div className="text-surface-on-variant dark:text-gray-400">Loading editor...</div>
            )}
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 shadow-lg">
                  <p className="text-surface-on dark:text-gray-100">Loading image...</p>
                </div>
              </div>
            )}
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
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
          {/* Navigation Dots */}
          {imageAttachments.length > 1 && (
            <div className="flex gap-1">
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
    </div>
  );
};

export default ImageViewerModal;
