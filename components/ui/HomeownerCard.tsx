import { MapPin, Hammer, Calendar, Phone, Mail, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HomeownerCardProps {
  name?: string;
  address?: string;
  builder?: string;
  project?: string;
  closingDate?: string;
  phone?: string;
  email?: string;
  onEdit?: () => void;
}

export function HomeownerCard({
  name,
  address,
  builder,
  project,
  closingDate,
  phone,
  email,
  onEdit,
}: HomeownerCardProps) {
  return (
    // CHANGED: rounded-xl -> rounded-[28px] to match Material 3 Dialog specs
    <div className="bg-white rounded-[28px] border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all h-full flex flex-col relative group">
      
      {/* 1. EDIT BUTTON */}
      <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full" // rounded-full on button too
          onClick={onEdit}
          title="Edit Homeowner Info"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>

      {/* 2. HEADER: Name & Project */}
      <div className="flex flex-col mb-6 pr-8">
        <h3 className={`font-bold text-lg leading-tight ${name ? "text-gray-900" : "text-gray-400 italic"}`}>
          {name || "Unknown Homeowner"}
        </h3>
        
        {project && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-[10px] h-5 px-2 font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200">
              {project}
            </Badge>
          </div>
        )}
      </div>

      {/* 3. UNIFIED INFO LIST */}
      <div className="space-y-4">
        
        {/* Address */}
        <div className="flex items-start group/item">
          <MapPin className="w-4 h-4 mt-0.5 mr-3 text-gray-400 group-hover/item:text-blue-500 transition-colors shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Address</span>
            <span className={`text-sm leading-snug ${address ? "text-gray-700" : "text-gray-300 italic"}`}>
              {address || "No address listed"}
            </span>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start group/item">
          <Phone className="w-4 h-4 mt-0.5 mr-3 text-gray-400 group-hover/item:text-blue-500 transition-colors shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Phone</span>
            <span className={`text-sm ${phone ? "text-gray-700 font-medium" : "text-gray-300 italic"}`}>
              {phone || "--"}
            </span>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start group/item">
          <Mail className="w-4 h-4 mt-0.5 mr-3 text-gray-400 group-hover/item:text-blue-500 transition-colors shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Email</span>
            <span className={`text-sm truncate block ${email ? "text-gray-700" : "text-gray-300 italic"}`} title={email}>
              {email || "--"}
            </span>
          </div>
        </div>

        {/* Builder */}
        <div className="flex items-start group/item border-t border-gray-50 pt-4 mt-2">
          <Hammer className="w-4 h-4 mt-0.5 mr-3 text-gray-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Builder</span>
            <span className={`text-sm ${builder ? "text-gray-700" : "text-gray-300 italic"}`}>
              {builder || "--"}
            </span>
          </div>
        </div>

        {/* Closing Date */}
        <div className="flex items-start group/item">
          <Calendar className="w-4 h-4 mt-0.5 mr-3 text-gray-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Closing Date</span>
            <span className={`text-sm ${closingDate ? "text-gray-700" : "text-gray-300 italic"}`}>
              {closingDate || "--"}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
