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
  const [tool, setTool] = useState<'select' | 'draw' | 'arrow' | 'rect' | 'circle' | 'text'>('select');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [color, setColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fabricLoaded, setFabricLoaded] = useState(false);

  // Load fabric.js dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('fabric').then((fabricModule) => {
      const fabricLib = (fabricModule as any).fabric || fabricModule;
      setFabricLoaded(true);
      
      if (!canvasRef.current) return;

      // Initialize Fabric.js canvas
      const canvas = new fabricLib.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    });

    fabricCanvasRef.current = canvas;

      // Load image
      fabricLib.Image.fromURL(imageUrl, (img: any) => {
      // Scale image to fit canvas
      const scale = Math.min(
        (canvas.width! - 40) / img.width!,
        (canvas.height! - 40) / img.height!
      );
      img.scale(scale);
      img.set({
        left: (canvas.width! - img.width! * scale) / 2,
        top: (canvas.height! - img.height! * scale) / 2,
      });
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
        scaleX: scale,
        scaleY: scale,
      });
      canvas.renderAll();
      saveState();
    });

    // Handle drawing
    let isDrawing = false;
    let path: any = null;

    canvas.on('mouse:down', (opt) => {
      if (tool === 'draw') {
        isDrawing = true;
        const pointer = canvas.getPointer(opt.e);
          path = new fabricLib.Path(`M ${pointer.x} ${pointer.y}`, {
          stroke: color,
          strokeWidth: strokeWidth,
          fill: '',
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
        });
        canvas.add(path);
      } else if (tool === 'arrow') {
        const pointer = canvas.getPointer(opt.e);
        const startX = pointer.x;
        const startY = pointer.y;

        canvas.on('mouse:move', (moveOpt) => {
          canvas.remove(path!);
          const movePointer = canvas.getPointer(moveOpt.e);
          const endX = movePointer.x;
          const endY = movePointer.y;

          // Create arrow using Path
          const dx = endX - startX;
          const dy = endY - startY;
          const angle = Math.atan2(dy, dx);
          const arrowLength = Math.sqrt(dx * dx + dy * dy);
          const arrowHeadLength = 15;
          const arrowHeadAngle = Math.PI / 6;

          const arrowPath = new fabricLib.Path(
            `M ${startX} ${startY} L ${endX} ${endY} M ${endX} ${endY} L ${endX - arrowHeadLength * Math.cos(angle - arrowHeadAngle)} ${endY - arrowHeadLength * Math.sin(angle - arrowHeadAngle)} M ${endX} ${endY} L ${endX - arrowHeadLength * Math.cos(angle + arrowHeadAngle)} ${endY - arrowHeadLength * Math.sin(angle + arrowHeadAngle)}`,
            {
              stroke: color,
              strokeWidth: strokeWidth,
              fill: '',
              strokeLineCap: 'round',
              strokeLineJoin: 'round',
            }
          );
          path = arrowPath;
          canvas.add(path);
        });

        canvas.on('mouse:up', () => {
          canvas.off('mouse:move');
          canvas.off('mouse:up');
          saveState();
        });
      } else if (tool === 'rect') {
        const pointer = canvas.getPointer(opt.e);
        const startX = pointer.x;
        const startY = pointer.y;

        const rect = new fabricLib.Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          stroke: color,
          strokeWidth: strokeWidth,
          fill: 'transparent',
        });
        canvas.add(rect);

        canvas.on('mouse:move', (moveOpt) => {
          const movePointer = canvas.getPointer(moveOpt.e);
          rect.set({
            width: Math.abs(movePointer.x - startX),
            height: Math.abs(movePointer.y - startY),
          });
          if (movePointer.x < startX) rect.set({ left: movePointer.x });
          if (movePointer.y < startY) rect.set({ top: movePointer.y });
          canvas.renderAll();
        });

        canvas.on('mouse:up', () => {
          canvas.off('mouse:move');
          canvas.off('mouse:up');
          saveState();
        });
      } else if (tool === 'circle') {
        const pointer = canvas.getPointer(opt.e);
        const startX = pointer.x;
        const startY = pointer.y;

        const circle = new fabricLib.Circle({
          left: startX,
          top: startY,
          radius: 0,
          stroke: color,
          strokeWidth: strokeWidth,
          fill: 'transparent',
        });
        canvas.add(circle);

        canvas.on('mouse:move', (moveOpt) => {
          const movePointer = canvas.getPointer(moveOpt.e);
          const radius = Math.sqrt(
            Math.pow(movePointer.x - startX, 2) + Math.pow(movePointer.y - startY, 2)
          );
          circle.set({ radius });
          canvas.renderAll();
        });

        canvas.on('mouse:up', () => {
          canvas.off('mouse:move');
          canvas.off('mouse:up');
          saveState();
        });
      } else if (tool === 'text') {
        const pointer = canvas.getPointer(opt.e);
        const text = new fabricLib.IText('Double click to edit', {
          left: pointer.x,
          top: pointer.y,
          fill: color,
          fontSize: 20,
          fontFamily: 'Arial',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        saveState();
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (tool === 'draw' && isDrawing && path) {
        const pointer = canvas.getPointer(opt.e);
        path.path.push(['L', pointer.x, pointer.y]);
        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', () => {
      if (tool === 'draw' && isDrawing) {
        isDrawing = false;
        saveState();
      }
    });

    // Save state for undo/redo
    const saveState = () => {
      const state = JSON.stringify(canvas.toJSON());
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(state);
        return newHistory.slice(-20); // Keep last 20 states
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 19));
    };

    canvas.on('object:added', saveState);
    canvas.on('object:removed', saveState);
    canvas.on('object:modified', saveState);

      return () => {
        canvas.dispose();
      };
    });
  }, [imageUrl, tool, color, strokeWidth, fabricLoaded]);

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
      <div className="bg-surface dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
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
              onClick={() => setTool('select')}
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
              onClick={() => setTool('draw')}
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
              onClick={() => setTool('arrow')}
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
              onClick={() => setTool('rect')}
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
              onClick={() => setTool('circle')}
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
              onClick={() => setTool('text')}
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
        <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900">
          <div className="flex items-center justify-center">
            <canvas ref={canvasRef} className="border border-surface-outline-variant dark:border-gray-700 shadow-lg" />
          </div>
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

