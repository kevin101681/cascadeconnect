import { Calendar, Paperclip, Send, User, FileText, CheckCircle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WarrantyCardProps {
  title?: string;
  classification?: string;
  createdDate?: string;
  scheduledDate?: string;
  soSentDate?: string;
  subName?: string;
  attachmentCount?: number;
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
  onClick,
}: WarrantyCardProps) {
  return (
    <div 
      onClick={onClick}
      // CHANGED: rounded-lg -> rounded-[28px], p-4 -> p-5
      className={`group relative bg-white rounded-[28px] border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all hover:border-blue-300 h-full flex flex-col justify-between focus:outline-none ${onClick ? 'cursor-pointer' : ''}`}
    >
      
      {/* 1. HEADER */}
      <div className="flex justify-between items-start mb-4 gap-2">
        <h3 className={`font-semibold text-sm line-clamp-1 ${title ? "text-gray-900" : "text-gray-400 italic"}`} title={title}>
          {title || "Untitled Claim"}
        </h3>
        
        {classification ? (
          <Badge variant="secondary" className="shrink-0 text-[10px] h-5 px-1.5 font-normal rounded-md">
            {classification}
          </Badge>
        ) : (
          <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" /> 
        )}
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
