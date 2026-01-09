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
      className={`group relative bg-white rounded-card border p-5 shadow-sm transition-all h-full flex flex-col justify-between
        ${onClick ? 'cursor-pointer' : ''}
        ${isCompleted ? 'border-gray-100 opacity-75 hover:opacity-100' : 'border-gray-200 hover:shadow-md hover:border-blue-300'}
      `}
    >
      
      {/* 1. HEADER: Title & Status Icon */}
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 shrink-0 ${isCompleted ? "text-green-500" : "text-blue-600"}`}>
            <CheckSquare className="w-4 h-4" />
          </div>
          <h3 className={`font-semibold text-sm line-clamp-2 ${isCompleted ? "text-gray-500 line-through" : "text-gray-900"}`} title={title}>
            {title}
          </h3>
        </div>
      </div>

      {/* 2. BODY: Metrics & Date */}
      <div className="space-y-3 mb-4">
        
        {/* Date Assigned */}
        <div className="flex items-center text-xs text-gray-500 ml-6">
          <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
          <span className="text-[10px] uppercase tracking-wider text-gray-400 mr-2">Assigned</span>
          <span className="font-medium text-gray-600">{dateAssigned}</span>
        </div>

        {/* Subs Counter Badge (Neutral Colors Now) */}
        <div className="ml-6 flex items-center">
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors">
                <Users className="w-3 h-3 mr-1.5 text-gray-400" />
                {subsToScheduleCount} 
                <span className="font-normal ml-1 opacity-80 text-gray-500">
                   {subsToScheduleCount === 1 ? "Sub" : "Subs"} to Schedule
                </span>
            </div>
        </div>
      </div>

      {/* 3. FOOTER: Assignment */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
        
        {/* User Assigned */}
        <div className="flex items-center">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 ${assignedTo ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
            <User className="w-3.5 h-3.5" />
          </div>
          <span className={`text-xs font-medium truncate ${assignedTo ? "text-gray-700" : "text-gray-400 italic"}`}>
            {assignedTo || "Unassigned"}
          </span>
        </div>

        {/* Subtle Arrow to indicate "Go to Task" */}
        <div className="text-gray-300 group-hover:text-blue-400 transition-colors">
            <ArrowRight className="w-4 h-4" />
        </div>

      </div>
    </div>
  );
}

