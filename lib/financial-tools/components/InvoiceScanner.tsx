
import React, { useRef, useState } from 'react';
import { X, RefreshCw, Loader2, ScanText, UploadCloud } from 'lucide-react';
import { Button } from './ui/Button';
import { parseInvoiceFromImage } from '../services/geminiService';
import { Invoice } from '../types';

interface InvoiceScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (invoiceData: Partial<Invoice>) => void;
}

export const InvoiceScanner: React.FC<InvoiceScannerProps> = ({ 
  isOpen, 
  onClose, 
  onScanComplete 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCapturedImage(result);
        processImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageBase64: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      // We pass no custom rules here for now, or we could add a settings field later
      const result = await parseInvoiceFromImage(imageBase64);
      if (result) {
        onScanComplete(result);
        onClose();
        handleReset();
      } else {
        setError("Could not extract data from image. Please try again.");
      }
    } catch (e) {
      setError("AI Processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="invoice-scanner-title">
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*,application/pdf" 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      <div className="w-full max-w-lg bg-surface rounded-3xl overflow-hidden relative flex flex-col shadow-2xl animate-slide-up">
        
        {/* Header */}
        <div className="p-4 border-b border-surfaceContainerHigh flex justify-between items-center bg-white">
          <h3 id="invoice-scanner-title" className="font-medium text-lg flex items-center gap-2">
            <ScanText className="text-primary" />
            Upload Invoice/Doc
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-surfaceContainer rounded-full" aria-label="Close invoice scanner">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-surfaceContainer/50 p-6 flex flex-col items-center justify-center min-h-[300px]">
            
            {/* View 1: Upload Prompt */}
            {!capturedImage && (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-64 border-2 border-dashed border-primary/30 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-primary/5 transition-colors group"
                >
                    <div className="w-16 h-16 rounded-full bg-primaryContainer text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UploadCloud size={32} />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-onSurface">Click to Upload Image/PDF</p>
                        <p className="text-xs text-outline mt-1">Screenshots, photos, or digital PDFs</p>
                    </div>
                </div>
            )}

            {/* View 2: Processing Preview */}
            {capturedImage && (
                <div className="space-y-6 flex flex-col items-center w-full">
                    <div className="relative w-full h-64 rounded-xl overflow-hidden shadow-lg bg-black/5 flex items-center justify-center">
                        {/* If it's a PDF, show icon instead of img preview */}
                        {capturedImage.includes('application/pdf') ? (
                            <div className="text-center p-4">
                                <ScanText size={64} className="mx-auto text-primary mb-2 opacity-50" />
                                <p className="text-sm font-medium text-onSurface">PDF Document</p>
                            </div>
                        ) : (
                            <img src={capturedImage} alt="Captured Document" className="w-full h-full object-contain opacity-70" />
                        )}
                        
                        <div className="absolute inset-0 flex items-center justify-center">
                             {isProcessing ? (
                                 <div className="bg-white/90 px-6 py-4 rounded-2xl flex flex-col items-center gap-3 shadow-xl backdrop-blur-md">
                                     <Loader2 className="animate-spin text-primary w-8 h-8" />
                                     <span className="text-sm font-medium">Analyzing Document...</span>
                                 </div>
                             ) : (
                                <div className="flex gap-2">
                                     <button onClick={handleReset} className="bg-white px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 hover:bg-gray-50">
                                        <RefreshCw size={16} /> Upload Different
                                    </button>
                                </div>
                             )}
                        </div>
                    </div>
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl text-center w-full shadow-sm">
                            <p className="font-medium mb-1">Analysis Failed</p>
                            <p className="text-xs opacity-80">{error}</p>
                            <Button variant="text" onClick={handleReset} className="mt-2 text-red-700 hover:bg-red-100">Try Again</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
