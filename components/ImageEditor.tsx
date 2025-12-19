import React, { useRef, useEffect, useState } from 'react';
import { X, Save, Undo, Redo, Type, Square, Circle, Minus, Pencil, Download } from 'lucide-react';
import Button from './Button';

interface ImageEditorProps {
  imageUrl: string;
  imageName: string;
  onSave: (editedImageUrl: string) => void;
  onClose: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, imageName, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fabricLibRef = useRef<any>(null);
  const [tool, setTool] = useState<'select' | 'draw' | 'arrow' | 'rect' | 'circle' | 'text'>('draw');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const [color, setColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Load fabric.js dynamically - only once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('fabric').then((fabricModule) => {
      const fabricLib = (fabricModule as any).fabric || fabricModule;
      fabricLibRef.current = fabricLib;
      setFabricLoaded(true);
      console.log('✅ Fabric.js loaded');
    });
  }, []); // Only run once

  // Initialize canvas after fabric is loaded and canvas ref is available
  useEffect(() => {
    if (!fabricLoaded || !fabricLibRef.current || !canvasRef.current) {
      return;
    }

    console.log('✅ Initializing canvas...');
    const fabricLib = fabricLibRef.current;

    // Initialize Fabric.js canvas
    const canvas = new fabricLib.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    });

    fabricCanvasRef.current = canvas;
    setCanvasInitialized(true);
    console.log('✅ Canvas initialized');

    return () => {
      if (canvas) {
        canvas.dispose();
      }
      setCanvasInitialized(false);
    };
  }, [fabricLoaded]); // Run when fabric is loaded

  // Save state for undo/redo
  const saveState = React.useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const state = JSON.stringify(canvas.toJSON());
    setHistory((prev) => {
      const currentIndex = historyIndexRef.current;
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(state);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex((prev) => {
      const newIndex = Math.min(prev + 1, 19);
      historyIndexRef.current = newIndex;
      return newIndex;
    });
  }, []);

  // Load image - separate effect
  useEffect(() => {
    console.log('🔄 Image loading effect triggered:', {
      fabricLoaded,
      canvasInitialized,
      hasCanvas: !!fabricCanvasRef.current,
      hasFabricLib: !!fabricLibRef.current,
      imageUrl: imageUrl?.substring(0, 50) + '...'
    });
    
    if (!fabricLoaded) {
      console.log('⏳ Waiting for fabric.js to load...');
      return;
    }
    
    if (!canvasInitialized || !fabricCanvasRef.current) {
      console.log('⏳ Waiting for canvas to be initialized...');
      return;
    }
    
    if (!fabricLibRef.current) {
      console.log('⏳ Waiting for fabric lib ref...');
      return;
    }
    
    if (!imageUrl) {
      console.log('⏳ No image URL provided');
      return;
    }
    
    console.log('✅ All requirements met, starting image load');

    const canvas = fabricCanvasRef.current;
    const fabricLib = fabricLibRef.current;
    
    console.log('Setting imageLoading to true');
    setImageLoading(true);
    setImageError(null);

    // Load image with error handling - use Promise-based API for better error handling
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setImageError('Image load timeout - the image may be too large or the URL may be invalid');
        setImageLoading(false);
      }
    }, 30000); // 30 second timeout

    // Load image using fabric.js Image.fromURL
    // In fabric.js v6, fromURL returns a Promise when called with options
    const loadImage = async () => {
      console.log('Loading image:', imageUrl);
      console.log('Fabric loaded:', fabricLoaded);
      console.log('Canvas ref:', !!canvasRef.current);
      console.log('Fabric lib:', !!fabricLib);
      
      try {
        const options = {
          crossOrigin: 'anonymous',
        };
        
        console.log('Calling Image.fromURL...');
        
        // In fabric.js v6, fromURL(url, options) returns a Promise
        // fromURL(url, callback, options) uses callback
        // Try Promise-based first (fabric.js v6 standard)
        const imagePromise = fabricLib.Image.fromURL(imageUrl, options);
        
        console.log('Image.fromURL returned:', typeof imagePromise);
        
        if (imagePromise && typeof imagePromise.then === 'function') {
          console.log('Using Promise-based API (fabric.js v6)');
          const img = await imagePromise;
          
          if (cancelled) return;
          clearTimeout(timeout);
          console.log('Image loaded via Promise:', img);
          handleImageLoaded(img);
        } else {
          // Fallback: Try callback-based API
          console.log('Trying callback-based API...');
          fabricLib.Image.fromURL(
            imageUrl,
            (img: any) => {
              if (cancelled) return;
              clearTimeout(timeout);
              console.log('Image loaded via callback:', img);
              handleImageLoaded(img);
            },
            options
          );
        }
      } catch (error: any) {
        console.error('Error in loadImage:', error);
        if (cancelled) return;
        clearTimeout(timeout);
        setImageError(error.message || 'Failed to load image');
        setImageLoading(false);
      }
    };
    
    const handleImageLoaded = (img: any) => {
      if (!img) {
        console.error('Image object is null');
        setImageError('Failed to load image - invalid image data');
        setImageLoading(false);
        return;
      }

      try {
        console.log('Image dimensions:', img.width, 'x', img.height);
        console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
        
        // Scale image to fit canvas
        const scale = Math.min(
          (canvas.width! - 40) / img.width!,
          (canvas.height! - 40) / img.height!
        );
        
        console.log('Calculated scale:', scale);
        console.log('Setting background image...');
        
        // In fabric.js v6, scale the image and set it as backgroundImage property
        img.scale(scale);
        
        // Center the image on canvas
        const scaledWidth = img.width! * scale;
        const scaledHeight = img.height! * scale;
        img.set({
          left: (canvas.width! - scaledWidth) / 2,
          top: (canvas.height! - scaledHeight) / 2,
          selectable: false,
          evented: false, // Don't block mouse events
        });
        
        // Set as background image (fabric.js v6 API)
        canvas.backgroundImage = img;
        canvas.renderAll();
        
        if (cancelled) return;
        console.log('Background image set, rendering...');
        saveState();
        setImageLoading(false);
        console.log('Image loading complete');
      } catch (error: any) {
        console.error('Error setting background image:', error);
        setImageError(error.message || 'Failed to set image on canvas');
        setImageLoading(false);
      }
    };

    loadImage();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [imageUrl, fabricLoaded, canvasInitialized]); // Re-run when canvas is initialized

  // Set up tool handlers - use refs to get latest values
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const strokeWidthRef = useRef(strokeWidth);

  useEffect(() => {
    toolRef.current = tool;
    colorRef.current = color;
    strokeWidthRef.current = strokeWidth;
  }, [tool, color, strokeWidth]);

  // Set up canvas event handlers
  useEffect(() => {
    if (!fabricLoaded || !canvasInitialized || !fabricCanvasRef.current || !fabricLibRef.current) {
      console.log('Tool handlers: waiting for canvas initialization', {
        fabricLoaded,
        canvasInitialized,
        hasCanvas: !!fabricCanvasRef.current,
        hasFabricLib: !!fabricLibRef.current
      });
      return;
    }

    console.log('Setting up tool handlers...');
    const canvas = fabricCanvasRef.current;
    const fabricLib = fabricLibRef.current;
    
    // Make sure background image doesn't block events
    if (canvas.backgroundImage) {
      canvas.backgroundImage.selectable = false;
      canvas.backgroundImage.evented = false;
    }

    // Handle drawing
    let isDrawing = false;
    let path: any = null;

    const handleMouseDown = (opt: any) => {
      const currentTool = toolRef.current;
      const currentColor = colorRef.current;
      const currentStrokeWidth = strokeWidthRef.current;

      // For select tool, allow default behavior (selection)
      if (currentTool === 'select') {
        return; // Let fabric.js handle selection
      }

      if (currentTool === 'draw') {
        isDrawing = true;
        const pointer = canvas.getPointer(opt.e);
        // Use Polyline for drawing in fabric.js v6 - simpler and more reliable
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
            objectCaching: false, // Better performance for drawing
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

          // Create arrow using Path
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
          // Update Polyline points
          if (path.points && Array.isArray(path.points)) {
            path.points.push({ x: pointer.x, y: pointer.y });
            path.set({ dirty: true }); // Mark as dirty to force re-render
            canvas.requestRenderAll();
          } else {
            console.error('Path does not have points array');
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
    
    // Update selection mode based on current tool
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
  }, [fabricLoaded, canvasInitialized, saveState]);
  
  // Update canvas selection mode when tool changes
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    canvas.selection = tool === 'select';
    canvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair';
  }, [tool, canvasInitialized]);

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
    if (fabricCanvasRef.current) {
      const dataUrl = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
      });
      onSave(dataUrl);
    }
  };

  const handleDownload = () => {
    if (fabricCanvasRef.current) {
      const dataUrl = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
      });
      const link = document.createElement('a');
      link.download = `edited-${imageName}`;
      link.href = dataUrl;
      link.click();
    }
  };

  if (!fabricLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-surface dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <p className="text-surface-on dark:text-gray-100">Loading image editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-outline-variant dark:border-gray-700">
          <h2 className="text-lg font-semibold text-surface-on dark:text-gray-100">
            Edit Image: {imageName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-surface-on dark:text-gray-100" />
          </button>
        </div>

        {/* Toolbar */}
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

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900 relative">
          <div className="flex items-center justify-center">
            <canvas ref={canvasRef} className="border border-surface-outline-variant dark:border-gray-700 shadow-lg" />
          </div>
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
                <p className="text-surface-on-variant dark:text-gray-400 text-xs mt-2">
                  Please check the image URL and try closing and reopening the editor.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-surface-outline-variant dark:border-gray-700">
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="filled" onClick={handleSave} icon={<Save className="h-4 w-4" />}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;

