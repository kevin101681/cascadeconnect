
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Loader2, Building, AlertCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { analyzeCheckImage, CheckAnalysisResult } from '../services/geminiService';
import { Client, Invoice } from '../types';

interface CheckScannerProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  invoices: Invoice[];
  onProcessPayments: (invoiceIds: string[], checkNumber: string) => void;
}

export const CheckScanner: React.FC<CheckScannerProps> = ({ 
  isOpen, 
  onClose, 
  clients, 
  invoices,
  onProcessPayments 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<CheckAnalysisResult | null>(null);
  const [matchedClient, setMatchedClient] = useState<Client | null>(null);
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Initialize Camera
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Camera Error:", err);
      setError("Unable to access camera. Please allow permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageBase64);
        stopCamera();
        processImage(imageBase64);
      }
    }
  };

  const processImage = async (imageBase64: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await analyzeCheckImage(imageBase64);
      if (result) {
        setScanResult(result);
        findMatch(result.payorName);
      } else {
        setError("Could not read check details. Please try again or check your API key.");
      }
    } catch (e: any) {
      console.error("Scan processing error:", e);
      setError(e.message || "AI Processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const findMatch = (scannedName: string) => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const search = normalize(scannedName);

    // Helper to check a specific name field against the search
    const isMatch = (dbName: string | undefined) => {
        if (!dbName) return false;
        const normDb = normalize(dbName);
        return normDb.includes(search) || search.includes(normDb);
    };

    // 1. Priority: Check "Name on Check" field
    let match = clients.find(c => isMatch(c.checkPayorName));

    // 2. Fallback: Check Company Name
    if (!match) {
        match = clients.find(c => isMatch(c.companyName));
    }

    // 3. Last Resort: Word matching on Company Name
    if (!match) {
        const words = scannedName.split(' ').filter(w => w.length > 3);
        match = clients.find(c => words.some(w => c.companyName.toLowerCase().includes(w.toLowerCase())));
    }

    if (match) {
      setMatchedClient(match);
      // Find outstanding invoices (Sent or Draft, not Paid)
      const outstanding = invoices.filter(inv => 
        inv.clientName === match?.companyName && 
        inv.status !== 'paid'
      );
      setOutstandingInvoices(outstanding);
      // Auto-select all
      setSelectedInvoiceIds(new Set(outstanding.map(i => i.id)));
    } else {
      setMatchedClient(null);
      setError(`No builder found matching "${scannedName}".`);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setScanResult(null);
    setMatchedClient(null);
    setOutstandingInvoices([]);
    setError(null);
    startCamera();
  };

  const toggleInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleSubmit = () => {
    if (scanResult && selectedInvoiceIds.size > 0) {
        onProcessPayments(Array.from(selectedInvoiceIds), scanResult.checkNumber);
        onClose();
        handleReset(); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface rounded-3xl overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-surfaceContainerHigh flex justify-between items-center bg-white">
          <h3 className="font-medium text-lg flex items-center gap-2">
            <Camera className="text-primary" />
            Check Scanner
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-surfaceContainer rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-surfaceContainer/50 p-4">
            
            {/* View 1: Camera Feed */}
            {!capturedImage && (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-[16/9] shadow-inner">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4 text-center text-white">
                            <p>{error}</p>
                        </div>
                    )}
                    
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <button 
                            onClick={captureImage}
                            className="w-16 h-16 rounded-full bg-white border-4 border-primary shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                        >
                            <div className="w-12 h-12 rounded-full bg-primary" />
                        </button>
                    </div>
                </div>
            )}

            {/* View 2: Processing / Result */}
            {capturedImage && (
                <div className="space-y-4">
                    <div className="relative h-32 w-full rounded-xl overflow-hidden">
                        <img src={capturedImage} alt="Captured Check" className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center">
                             {isProcessing ? (
                                 <div className="bg-white/90 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
                                     <Loader2 className="animate-spin text-primary" />
                                     <span className="text-sm font-medium">Scanning Check...</span>
                                 </div>
                             ) : (
                                <button onClick={handleReset} className="bg-white/90 px-3 py-1 rounded-full text-xs font-medium shadow-sm flex items-center gap-1 hover:bg-white">
                                    <RefreshCw size={12} /> Retake
                                </button>
                             )}
                        </div>
                    </div>

                    {/* ERROR DISPLAY */}
                    {!isProcessing && error && (
                        <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl text-center w-full shadow-sm animate-slide-up">
                            <AlertCircle className="mx-auto mb-2 text-red-600" size={24} />
                            <p className="font-medium">Scan Failed</p>
                            <p className="text-xs opacity-80 mt-1">{error}</p>
                            <Button variant="text" onClick={handleReset} className="mt-2 text-red-700 hover:bg-red-100">Try Again</Button>
                        </div>
                    )}

                    {!isProcessing && scanResult && (
                        <div className="space-y-4 animate-slide-up">
                            {/* Check Details */}
                            <div className="bg-white p-4 rounded-xl border border-surfaceContainerHigh">
                                <p className="text-xs text-outline uppercase tracking-wider mb-1">Scanned Details</p>
                                <div className="flex justify-between items-baseline">
                                    <h4 className="font-bold text-lg">{scanResult.payorName}</h4>
                                    <span className="text-primary font-mono text-lg">${scanResult.amount.toFixed(0)}</span>
                                </div>
                                <p className="text-sm text-outline mt-1">Check #: {scanResult.checkNumber}</p>
                            </div>

                            {/* Match Result */}
                            {matchedClient ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg text-sm">
                                        <Check size={16} />
                                        <span>Matched Builder: <strong>{matchedClient.companyName}</strong></span>
                                    </div>
                                    {matchedClient.checkPayorName && (
                                       <p className="text-xs text-outline ml-8 -mt-2">Matched via check name: "{matchedClient.checkPayorName}"</p>
                                    )}

                                    <h5 className="font-medium text-sm text-outline mt-2">Outstanding Invoices</h5>
                                    {outstandingInvoices.length > 0 ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {outstandingInvoices.map(inv => (
                                                <div 
                                                    key={inv.id}
                                                    onClick={() => toggleInvoice(inv.id)}
                                                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                                                        selectedInvoiceIds.has(inv.id) 
                                                        ? 'bg-primaryContainer/30 border-primary' 
                                                        : 'bg-white border-transparent hover:bg-white/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                                            selectedInvoiceIds.has(inv.id) ? 'bg-primary border-primary' : 'border-outline'
                                                        }`}>
                                                            {selectedInvoiceIds.has(inv.id) && <Check size={12} className="text-white" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                                                            <p className="text-xs text-outline">{inv.date}</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-medium">${inv.total.toFixed(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-outline text-sm">
                                            No outstanding invoices found for this builder.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-red-50 p-4 rounded-xl text-center space-y-2">
                                    <AlertCircle className="mx-auto text-red-500" />
                                    <p className="text-red-700 font-medium">Builder Not Found</p>
                                    <p className="text-xs text-red-600">The name on the check "{scanResult.payorName}" didn't match any active builders.</p>
                                    <p className="text-xs text-outline pt-2">Tip: Add "{scanResult.payorName}" to the "Name on Check" field in the Builder's profile.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Footer Actions */}
        {capturedImage && !isProcessing && (
            <div className="p-4 bg-white border-t border-surfaceContainerHigh">
                <Button 
                    className="w-full" 
                    disabled={!matchedClient || selectedInvoiceIds.size === 0}
                    onClick={handleSubmit}
                >
                    Pay {selectedInvoiceIds.size} Invoice{selectedInvoiceIds.size !== 1 ? 's' : ''}
                </Button>
            </div>
        )}
      </div>
    </div>
  );
};
