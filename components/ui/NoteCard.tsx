import { Calendar, StickyNote } from "lucide-react";

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
      className={`group relative bg-white rounded-card border p-3 shadow-sm transition-all flex flex-col
        ${isCompleted 
          ? 'border-gray-100 bg-gray-50/50 opacity-75' 
          : 'border-gray-200 hover:shadow-md hover:border-blue-300'
        }
      `}
    >
      
      {/* COMPACT BODY: Icon + Content */}
      <div className="flex gap-2 mb-2 min-h-0">
        {/* Icon Anchor - Smaller */}
        <div className={`mt-0.5 shrink-0 ${isCompleted ? "text-gray-400" : "text-amber-400"}`}>
           <StickyNote className="w-3.5 h-3.5" />
        </div>

        {/* Note Text - Compact with line-clamp */}
        <p className={`text-sm leading-snug whitespace-pre-wrap line-clamp-3 ${isCompleted ? "text-gray-400 line-through" : "text-gray-700"}`}>
          {content}
        </p>
      </div>

      {/* COMPACT FOOTER: Date & Checkbox on Same Line */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        
        {/* Date Created */}
        <div className="flex items-center text-xs text-gray-400">
           <Calendar className="w-3 h-3 mr-1.5" />
           {dateCreated}
        </div>

        {/* Mark as Complete Checkbox - Compact */}
        <div className="flex items-center gap-1.5">
            <label 
              htmlFor={`note-complete-${dateCreated}`}
              className={`text-[10px] uppercase tracking-wider font-medium cursor-pointer select-none transition-colors ${isCompleted ? "text-gray-400" : "text-gray-500 group-hover:text-blue-600"}`}
            >
                {isCompleted ? "Done" : "Done?"}
            </label>
            
            <input
              type="checkbox"
              id={`note-complete-${dateCreated}`}
              checked={isCompleted}
              onChange={(e) => onToggle?.(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
            />
        </div>

      </div>
    </div>
  );
}
