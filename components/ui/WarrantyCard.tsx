import { Calendar, Paperclip, Send, Hammer, FileText, CheckCircle2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WarrantyCardProps {
  title?: string;
  classification?: string;
  createdDate?: string;
  scheduledDate?: string;
  soSentDate?: string;
  subName?: string;
  attachmentCount?: number;
  isReviewed?: boolean;
  isClosed?: boolean;
  isSelected?: boolean;
  isChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  onDelete?: () => void;
  onClick?: () => void;
  isHomeownerView?: boolean;
}

export function WarrantyCard({
  title,
  classification,
  createdDate,
  scheduledDate,
  soSentDate,
  subName,
  attachmentCount = 0,
  isReviewed = false,
  isClosed = false,
  isSelected = false,
  isChecked = false,
  onCheckboxChange,
  onDelete,
  onClick,
  isHomeownerView = false,
}: WarrantyCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`group relative rounded-lg border p-3 transition-all flex flex-col touch-manipulation ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isChecked 
          ? 'bg-red-50 border-red-300 ring-1 ring-red-300 shadow-md' 
          : isSelected
            ? 'bg-slate-50 dark:bg-slate-900/50 border-primary dark:border-primary shadow-md'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm md:hover:shadow-md md:hover:border-slate-300 dark:md:hover:border-slate-600'
      }`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
    >
      
      {/* HEADER: Title + Status Pills + Delete Icon */}
      <div className="flex items-center gap-2 mb-2 min-w-0">
        {/* Title - Grows to take available space */}
        <h3 className={`font-semibold text-sm truncate flex-1 min-w-0 select-none ${title ? "text-primary dark:text-primary" : "text-gray-400 italic"}`} title={title}>
          {title || "Untitled Claim"}
        </h3>
        
        {/* Status Pills */}
        <div className="flex gap-1 shrink-0">
          {isClosed && (
             <Badge className="text-[10px] h-5 px-1.5 font-medium bg-blue-600 text-white border-0 rounded-md gap-1 flex items-center pointer-events-none">
               <CheckCircle2 className="w-3 h-3" /> Closed
             </Badge>
          )}
          
          {isReviewed && !isClosed && (
             <Badge className="text-[10px] h-5 px-1.5 font-medium bg-green-100 text-green-800 border-0 rounded-md gap-1 flex items-center pointer-events-none">
               <CheckCircle2 className="w-3 h-3" /> Reviewed
             </Badge>
          )}
          
          {classification ? (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal rounded-md text-primary dark:text-primary pointer-events-none">
              {classification}
            </Badge>
          ) : (
            <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" /> 
          )}
        </div>
        
        {/* Delete Icon - Always visible, subtle gray - Hidden in Homeowner View */}
        {onDelete && !isHomeownerView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 shrink-0 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete claim"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* COMPACT DATES ROW: Side-by-Side with Icons and Bullets */}
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-600 overflow-x-auto select-none">
        {/* Created */}
        <div className="flex items-center gap-1 shrink-0">
          <FileText className="w-3 h-3 text-gray-400" />
          <span>{createdDate || "--"}</span>
        </div>
        
        <span className="text-gray-300 shrink-0">•</span>
        
        {/* Scheduled */}
        <div className={`flex items-center gap-1 shrink-0 ${scheduledDate ? "text-gray-600" : "text-gray-400"}`}>
          <Calendar className={`w-3 h-3 ${scheduledDate ? "text-slate-600 dark:text-slate-400" : "text-gray-300"}`} />
          <span>{scheduledDate || "--"}</span>
        </div>
        
        <span className="text-gray-300 shrink-0">•</span>
        
        {/* SO Sent */}
        <div className={`flex items-center gap-1 shrink-0 ${soSentDate ? "text-gray-600" : "text-gray-400"}`}>
          <Send className={`w-3 h-3 ${soSentDate ? "text-green-500" : "text-gray-300"}`} />
          <span>{soSentDate || "--"}</span>
        </div>
      </div>

      {/* FOOTER: Assignee + Attachments + Checkbox */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 select-none">
        {/* Sub Contractor */}
        <div className="flex items-center min-w-0 flex-1 mr-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mr-1.5 ${subName ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" : "bg-gray-100 text-gray-400"}`}>
            <Hammer className="w-3 h-3" />
          </div>
          <span className={`text-xs font-medium truncate ${subName ? "text-gray-700" : "text-gray-400 italic"}`}>
            {subName || "Unassigned"}
          </span>
        </div>

        {/* Right side: Attachment Count + Checkbox */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Attachment Count */}
          <div className={`flex items-center ${attachmentCount > 0 ? "text-gray-500" : "text-gray-300"}`}>
            <Paperclip className="w-3 h-3 mr-1" />
            <span className="text-xs font-medium">{attachmentCount}</span>
          </div>

          {/* Circular Checkbox in Bottom Right - Hidden in Homeowner View */}
          {onCheckboxChange && !isHomeownerView && (
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                e.stopPropagation();
                onCheckboxChange(e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          )}
        </div>
      </div>
    </div>
  );
}
