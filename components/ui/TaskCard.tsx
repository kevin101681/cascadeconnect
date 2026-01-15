import { Calendar, User, Users, CheckSquare, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TaskCardProps {
  title: string;
  assignedTo?: string; 
  subsToScheduleCount?: number;
  dateAssigned: string;
  isCompleted?: boolean;
  onClick?: () => void;
}

export function TaskCard({
  title,
  assignedTo,
  subsToScheduleCount = 0,
  dateAssigned,
  isCompleted = false,
  onClick,
}: TaskCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`group relative bg-white rounded-card border p-3 shadow-sm transition-all h-full flex flex-col justify-between
        ${onClick ? 'cursor-pointer' : ''}
        ${isCompleted ? 'border-gray-100 opacity-75 hover:opacity-100' : 'border-gray-200 hover:shadow-md hover:border-blue-300'}
      `}
    >
      
      {/* 1. HEADER: Title & Date on Same Line */}
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className={`mt-0.5 shrink-0 ${isCompleted ? "text-green-500" : "text-blue-600"}`}>
            <CheckSquare className="w-4 h-4" />
          </div>
          <h3 className={`font-semibold text-sm line-clamp-2 flex-1 ${isCompleted ? "text-gray-500 line-through" : "text-gray-900"}`} title={title}>
            {title}
          </h3>
        </div>
        <span className="text-xs text-gray-500 shrink-0">{dateAssigned}</span>
      </div>

      {/* 2. BODY: Subs Counter - Compact Single Row */}
      <div className="flex items-center gap-1 mb-3 ml-6 text-xs text-gray-500">
        <Users className="w-3 h-3 text-gray-400" />
        <span className="font-medium text-gray-600">{subsToScheduleCount}</span>
        <span className="text-gray-500">{subsToScheduleCount === 1 ? "Sub" : "Subs"} to Schedule</span>
      </div>

      {/* 3. FOOTER: Assignment */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
        
        {/* User Assigned */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${assignedTo ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
            <User className="w-3.5 h-3.5" />
          </div>
          <span className={`text-xs font-medium truncate ${assignedTo ? "text-gray-700" : "text-gray-400 italic"}`}>
            {assignedTo || "Unassigned"}
          </span>
        </div>

        {/* Subtle Arrow to indicate "Go to Task" */}
        <div className="text-gray-300 group-hover:text-blue-400 transition-colors shrink-0">
            <ArrowRight className="w-4 h-4" />
        </div>

      </div>
    </div>
  );
}

