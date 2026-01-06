import { Calendar, Paperclip, Send, User, FileText, CheckCircle2 } from "lucide-react"; // Added CheckCircle2
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
  isSelected?: boolean; // New Prop for selected state
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
  isSelected = false, // Default to false
  onClick,
}: WarrantyCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`group relative rounded-[28px] border p-5 transition-all h-full flex flex-col justify-between focus:outline-none ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isSelected 
          ? 'bg-blue-50 border-blue-500 shadow-md' 
          : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300'
      }`}
    >
      
      {/* 1. HEADER */}
      <div className="flex justify-between items-start mb-4 gap-2">
        <h3 className={`font-semibold text-sm line-clamp-1 ${title ? "text-gray-900" : "text-gray-400 italic"}`} title={title}>
          {title || "Untitled Claim"}
        </h3>
        
        {/* PILL STACK: Classification + Reviewed */}
        <div className="flex gap-1 shrink-0">
          {isReviewed && (
             <Badge className="text-[10px] h-5 px-1.5 font-medium bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-md gap-1 flex items-center">
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

      {/* 2. BODY: The Date Grid */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {/* Created */}
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Created</span>
          <div className="flex items-center text-xs text-gray-600">
            <FileText className="w-3 h-3 mr-1.5 text-gray-400 shrink-0" />
            <span className="truncate">{createdDate || "--"}</span>
          </div>
        </div>
        
        {/* Scheduled */}
        <div className="flex flex-col border-l border-gray-100 pl-3">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Sched</span>
          <div className={`flex items-center text-xs ${scheduledDate ? "text-gray-600" : "text-gray-300"}`}>
            <Calendar className={`w-3 h-3 mr-1.5 shrink-0 ${scheduledDate ? "text-blue-500" : "text-gray-300"}`} />
            <span className="truncate">{scheduledDate || "--"}</span>
          </div>
        </div>

        {/* Sent */}
        <div className="flex flex-col border-l border-gray-100 pl-3">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">SO Sent</span>
          <div className={`flex items-center text-xs ${soSentDate ? "text-gray-600" : "text-gray-300"}`}>
            <Send className={`w-3 h-3 mr-1.5 shrink-0 ${soSentDate ? "text-green-500" : "text-gray-300"}`} />
            <span className="truncate">{soSentDate || "--"}</span>
          </div>
        </div>
      </div>

      {/* 3. FOOTER */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
        {/* Sub Contractor */}
        <div className="flex items-center max-w-[75%]">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 ${subName ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
            <User className="w-3.5 h-3.5" />
          </div>
          <span className={`text-xs font-medium truncate ${subName ? "text-gray-700" : "text-gray-400 italic"}`}>
            {subName || "Unassigned"}
          </span>
        </div>

        {/* Attachment Count */}
        <div className={`flex items-center transition-colors ${attachmentCount > 0 ? "text-gray-500 hover:text-gray-800" : "text-gray-300"}`}>
          <Paperclip className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs font-medium">{attachmentCount}</span>
        </div>
      </div>
    </div>
  );
}
