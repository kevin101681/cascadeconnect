import { User, Calendar, MessageSquare, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MessageCardProps {
  title: string;
  senderName: string;
  dateSent: string;
  messagePreview?: string;
  isRead?: boolean;
  onClick?: () => void;
}

export function MessageCard({
  title,
  senderName,
  dateSent,
  messagePreview,
  isRead = true, // Default to read
  onClick,
}: MessageCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`group relative bg-white rounded-lg border p-5 shadow-sm transition-all h-full flex flex-col justify-between
        ${onClick ? 'cursor-pointer' : ''}
        ${isRead ? 'border-gray-200 hover:border-blue-300 hover:shadow-md' : 'border-blue-200 bg-blue-50/30 hover:shadow-md'}
      `}
    >
      
      {/* 1. HEADER: Title & Unread Indicator */}
      <div className="flex justify-between items-start mb-2 gap-3">
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 shrink-0 ${isRead ? "text-gray-400" : "text-blue-600"}`}>
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className={`font-semibold text-sm line-clamp-2 ${isRead ? "text-gray-700" : "text-gray-900"}`} title={title}>
            {title}
          </h3>
        </div>
        
        {/* Unread Dot */}
        {!isRead && (
          <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-2 ring-white" />
        )}
      </div>

      {/* 2. BODY: Message Preview */}
      {messagePreview && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 line-clamp-1">
            {messagePreview}
          </p>
        </div>
      )}

      {/* 3. FOOTER: Sender & Date */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
        
        {/* Sender Info - No Avatar */}
        <div className="flex items-center">
          <span className={`text-xs font-medium truncate ${isRead ? "text-gray-600" : "text-gray-900"}`}>
            {senderName}
          </span>
        </div>

        {/* Date Sent */}
        <div className="flex items-center text-xs text-gray-400">
           <Clock className="w-3 h-3 mr-1.5" />
           {dateSent}
        </div>

      </div>
    </div>
  );
}

