import { Calendar, StickyNote } from "lucide-react";
// Using standard input for maximum compatibility

interface NoteCardProps {
  content: string;
  dateCreated: string;
  isCompleted?: boolean;
  onToggle?: (checked: boolean) => void;
}

export function NoteCard({
  content,
  dateCreated,
  isCompleted = false,
  onToggle,
}: NoteCardProps) {
  return (
    <div 
      className={`group relative bg-white rounded-[28px] border p-5 shadow-sm transition-all h-full flex flex-col justify-between
        ${isCompleted 
          ? 'border-gray-100 bg-gray-50/50 opacity-75' 
          : 'border-gray-200 hover:shadow-md hover:border-blue-300'
        }
      `}
    >
      
      {/* 1. HEADER/BODY: The Content */}
      <div className="flex gap-3 mb-4">
        {/* Icon Anchor */}
        <div className={`mt-0.5 shrink-0 ${isCompleted ? "text-gray-400" : "text-amber-400"}`}>
           <StickyNote className="w-4 h-4" />
        </div>

        {/* Note Text */}
        <p className={`text-sm leading-relaxed whitespace-pre-wrap line-clamp-4 ${isCompleted ? "text-gray-400 line-through" : "text-gray-700"}`}>
          {content}
        </p>
      </div>

      {/* 2. FOOTER: Date & Action */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
        
        {/* Date Created */}
        <div className="flex items-center text-xs text-gray-400">
           <Calendar className="w-3 h-3 mr-1.5" />
           {dateCreated}
        </div>

        {/* Mark as Complete Checkbox */}
        <div className="flex items-center gap-2">
            <label 
              htmlFor="note-complete" 
              className={`text-[10px] uppercase tracking-wider font-medium cursor-pointer select-none transition-colors ${isCompleted ? "text-gray-400" : "text-gray-500 group-hover:text-blue-600"}`}
            >
                {isCompleted ? "Completed" : "Mark Done"}
            </label>
            
            {/* Using standard input for maximum compatibility */}
            <input
              type="checkbox"
              id="note-complete"
              checked={isCompleted}
              onChange={(e) => onToggle?.(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
            />
        </div>

      </div>
    </div>
  );
}

