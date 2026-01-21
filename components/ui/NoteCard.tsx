import { Calendar } from "lucide-react";

interface NoteCardProps {
  content: string;
  dateCreated: string;
  contextLabel?: string | null; // Context source label to display
  isCompleted?: boolean;
  onToggle?: (checked: boolean) => void;
}

export function NoteCard({
  content,
  dateCreated,
  contextLabel,
  isCompleted = false,
  onToggle,
}: NoteCardProps) {
  return (
    <div 
      className={`group relative bg-white rounded-xl border p-3 shadow-sm transition-all flex flex-col
        ${isCompleted 
          ? 'border-gray-100 bg-gray-50/50 opacity-75' 
          : 'border-gray-200 hover:shadow-md hover:border-blue-300'
        }
      `}
    >
      
      {/* HEADER: Checkbox + Note Text */}
      <div className="flex gap-2 mb-2 min-h-0">
        {/* Checkbox - Top Left */}
        <div className="shrink-0 pt-0.5">
          <input
            type="checkbox"
            id={`note-complete-${dateCreated}`}
            checked={isCompleted}
            onChange={(e) => onToggle?.(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
          />
        </div>

        {/* Note Text */}
        <p className={`text-sm leading-snug whitespace-pre-wrap line-clamp-3 ${isCompleted ? "text-gray-400 line-through" : "text-gray-700"}`}>
          {content}
        </p>
      </div>

      {/* FOOTER: Date + Context Label */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center text-xs text-gray-400">
           <Calendar className="w-3 h-3 mr-1.5" />
           {dateCreated}
        </div>
        
        {/* Context Label (if present) */}
        {contextLabel && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-medium">
            {contextLabel}
          </span>
        )}
      </div>
    </div>
  );
}
