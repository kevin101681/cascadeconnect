import { Calendar, Paperclip, Send, Hammer, FileText, CheckCircle2 } from "lucide-react";
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
  onClick?: () => void;
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
  onClick,
}: WarrantyCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`group relative rounded-lg border p-3 transition-all flex flex-col touch-manipulation ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isSelected 
          ? 'bg-blue-50 border-blue-500 shadow-md' 
          : 'bg-white border-gray-200 shadow-sm md:hover:shadow-md md:hover:border-blue-300'
      }`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
    >
      
      {/* COMPACT HEADER: Title + Badges on Same Line */}
      <div className="flex justify-between items-center mb-2 gap-2 min-w-0">
        <h3 className={`font-semibold text-sm truncate ${title ? "text-gray-900" : "text-gray-400 italic"}`} title={title}>
          {title || "Untitled Claim"}
        </h3>
        
        {/* BADGE STACK: Closed + Reviewed + Classification */}
        <div className="flex gap-1 shrink-0">
          {isClosed && (
             <Badge className="text-[10px] h-5 px-1.5 font-medium bg-blue-600 text-white hover:bg-blue-600 border-0 rounded-md gap-1 flex items-center">
               <CheckCircle2 className="w-3 h-3" /> Closed
             </Badge>
          )}
          
          {isReviewed && !isClosed && (
             <Badge className="text-[10px] h-5 px-1.5 font-medium bg-green-100 text-green-800 hover:bg-green-100 border-0 rounded-md gap-1 flex items-center">
               <CheckCircle2 className="w-3 h-3" /> Reviewed
             </Badge>
          )}
          
          {classification ? (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal rounded-md">
              {classification}
            </Badge>
          ) : (
            <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" /> 
          )}
        </div>
      </div>

      {/* COMPACT DATES ROW: Side-by-Side with Icons and Bullets */}
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-600 overflow-x-auto">
        {/* Created */}
        <div className="flex items-center gap-1 shrink-0">
          <FileText className="w-3 h-3 text-gray-400" />
          <span>{createdDate || "--"}</span>
        </div>
        
        <span className="text-gray-300 shrink-0">•</span>
        
        {/* Scheduled */}
        <div className={`flex items-center gap-1 shrink-0 ${scheduledDate ? "text-gray-600" : "text-gray-400"}`}>
          <Calendar className={`w-3 h-3 ${scheduledDate ? "text-blue-500" : "text-gray-300"}`} />
          <span>{scheduledDate || "--"}</span>
        </div>
        
        <span className="text-gray-300 shrink-0">•</span>
        
        {/* SO Sent */}
        <div className={`flex items-center gap-1 shrink-0 ${soSentDate ? "text-gray-600" : "text-gray-400"}`}>
          <Send className={`w-3 h-3 ${soSentDate ? "text-green-500" : "text-gray-300"}`} />
          <span>{soSentDate || "--"}</span>
        </div>
      </div>

      {/* COMPACT FOOTER: Assignee + Attachments on Same Line */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {/* Sub Contractor */}
        <div className="flex items-center min-w-0 flex-1 mr-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mr-1.5 ${subName ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
            <Hammer className="w-3 h-3" />
          </div>
          <span className={`text-xs font-medium truncate ${subName ? "text-gray-700" : "text-gray-400 italic"}`}>
            {subName || "Unassigned"}
          </span>
        </div>

        {/* Attachment Count */}
        <div className={`flex items-center shrink-0 ${attachmentCount > 0 ? "text-gray-500 md:hover:text-gray-800" : "text-gray-300"}`}>
          <Paperclip className="w-3 h-3 mr-1" />
          <span className="text-xs font-medium">{attachmentCount}</span>
        </div>
      </div>
    </div>
  );
}
