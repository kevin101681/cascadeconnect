import { Phone, Clock, Trash2, CheckCircle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CallerCardProps {
  callerName: string;
  dateTime: string;
  description: string;
  status: "Verified" | "Unverified";
  onDelete?: () => void;
  onClick?: () => void;
}

export function CallerCard({
  callerName,
  dateTime,
  description,
  status,
  onDelete,
  onClick,
}: CallerCardProps) {
  
  const isVerified = status === "Verified";

  return (
    <div 
      onClick={onClick}
      className={`group relative bg-white rounded-[28px] border border-gray-200 p-5 shadow-sm transition-all h-full flex flex-col justify-between
        ${onClick ? 'cursor-pointer' : ''}
        hover:shadow-md hover:border-blue-300
      `}
    >
      
      {/* 1. HEADER: Name & Status Badge */}
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex items-center gap-2">
          {/* Changed from Purple to Blue */}
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
             <Phone className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-1" title={callerName}>
            {callerName}
          </h3>
        </div>
        
        <Badge 
          variant="outline" 
          className={`shrink-0 text-[10px] h-5 px-1.5 font-medium border-0 ${
            isVerified 
              ? "bg-green-50 text-green-700" 
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {isVerified ? (
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Verified</span>
          ) : (
            <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Unverified</span>
          )}
        </Badge>
      </div>

      {/* 2. BODY: Description */}
      <div className="mb-4 pl-10">
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
          {description}
        </p>
      </div>

      {/* 3. FOOTER: Time & Delete */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
        
        {/* Date/Time */}
        <div className="flex items-center text-xs text-gray-400">
           <Clock className="w-3 h-3 mr-1.5" />
           {dateTime}
        </div>

        {/* Delete Action (Icon Only) */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 -mr-2"
          onClick={(e) => {
            e.stopPropagation(); 
            onDelete?.();
          }}
          title="Delete Call Log"
        >
            <Trash2 className="w-3.5 h-3.5" />
        </Button>

      </div>
    </div>
  );
}

