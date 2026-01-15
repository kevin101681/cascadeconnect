import { FileText, Calendar, MapPin, Hammer, Mail, Download, Trash2, Check, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface InvoiceCardProps {
  invoiceNumber: string;
  status: "Draft" | "Sent" | "Overdue" | "Paid";
  amount: string;
  createdDate: string;
  dueDate: string;
  builder?: string;
  address?: string;
  checkNumber?: string;
  isSelected?: boolean; // Selected state for split-view
  onClick?: () => void;
  onMarkPaid?: (checkNum: string) => void;
  onCheckNumberUpdate?: (checkNum: string) => void;
  onEmail?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

export function InvoiceCard({
  invoiceNumber,
  status,
  amount,
  createdDate,
  dueDate,
  builder,
  address,
  checkNumber = "",
  isSelected = false,
  onClick,
  onMarkPaid,
  onCheckNumberUpdate,
  onEmail,
  onDownload,
  onDelete,
}: InvoiceCardProps) {
  
  // Local state for check number to enable instant typing
  const [checkNum, setCheckNum] = useState(checkNumber);
  
  // Helper for Status Badge Colors
  const getStatusColor = (s: string) => {
    switch (s) {
      case "Paid": 
        return "!bg-green-100 !text-green-800 hover:!bg-green-100 !border-0";
      case "Draft": 
        return "!bg-gray-100 !text-gray-700 hover:!bg-gray-100 !border-0";
      default: 
        return "!bg-blue-50 !text-blue-800 hover:!bg-blue-50 !border-0";
    }
  };

  // Visual Override: If data says "Overdue", we display "Sent"
  const displayStatus = status === "Overdue" ? "Sent" : status;
  const isPaid = status === "Paid";
  
  // Auto-save check number
  const handleSaveCheckNumber = () => {
    if (checkNum === checkNumber) return;
    onCheckNumberUpdate?.(checkNum);
  };

  return (
    <div 
      onClick={onClick}
      className={`group relative rounded-card p-3 transition-all flex flex-col touch-manipulation ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isSelected 
          ? 'bg-blue-50 border-blue-500 shadow-md border-2' 
          : 'bg-white border border-gray-200 shadow-sm md:hover:shadow-md md:hover:border-blue-300'
      }`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
    >
      
      {/* COMPACT HEADER: Invoice # | Status Badge | Amount */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{invoiceNumber}</span>
          <Badge className={`rounded-md px-2 py-0.5 text-[10px] uppercase font-bold ${getStatusColor(status)}`}>
            {displayStatus}
          </Badge>
        </div>
        <div className="text-gray-900 font-bold text-base">
          {amount}
        </div>
      </div>

      {/* COMPACT DATES ROW: Side-by-side */}
      <div className="flex items-center gap-3 mb-2 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Created:</span>
          <span>{createdDate}</span>
        </div>
        <span className="text-gray-300">•</span>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Due:</span>
          <span className="font-medium">{dueDate}</span>
        </div>
      </div>

      {/* COMPACT BUILDER/ADDRESS: Single line with bullet separator */}
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-700 min-w-0">
        <Hammer className="w-3 h-3 text-gray-400 shrink-0" />
        <span className="truncate">{builder || "--"}</span>
        {address && (
          <>
            <span className="text-gray-300 shrink-0">•</span>
            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="truncate text-gray-600">{address}</span>
          </>
        )}
      </div>

      {/* COMPACT FOOTER: Payment Input */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        
        {/* Compact Check Number Field */}
        <div className="mb-2">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">
            {isPaid ? "Paid via Check #" : "Check #"}
          </label>
          <div className="relative">
             <Input 
                value={checkNum}
                onChange={(e) => setCheckNum(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={handleSaveCheckNumber}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                disabled={isPaid}
                placeholder="Enter check #..."
                className="h-7 text-xs bg-white pr-8 rounded-md border-gray-300 focus-visible:ring-blue-500"
             />
             {isPaid && <Check className="w-3 h-3 text-green-500 absolute right-2 top-2" />}
          </div>
        </div>

        {/* Compact Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Primary Action - Smaller */}
          {!isPaid ? (
            <Button 
              size="sm" 
              className="h-7 text-xs !bg-green-50 hover:!bg-green-100 !text-green-800 flex-1 rounded-md !border-0"
              onClick={(e) => {
                e.stopPropagation();
                onMarkPaid?.(checkNum);
              }}
            >
              Pay
            </Button>
          ) : (
             <Button size="sm" variant="outline" className="h-7 text-xs flex-1 cursor-default !bg-gray-50 !text-gray-600 !border-gray-200 hover:!bg-gray-50 rounded-md">
                Paid
             </Button>
          )}

          {/* Icon-Only Actions - Smaller */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full" 
            title="Email PDF" 
            onClick={(e) => {
              e.stopPropagation();
              onEmail?.();
            }}
          >
             <Mail className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full" 
            title="Download PDF" 
            onClick={(e) => {
              e.stopPropagation();
              onDownload?.();
            }}
          >
             <Download className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full" 
            title="Delete" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
          >
             <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

    </div>
  );
}
