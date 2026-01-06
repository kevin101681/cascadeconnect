import { User, MapPin, Hammer, Calendar, Phone, Mail, Edit2 } from "lucide-react";
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all h-full flex flex-col relative group">
      
      {/* 1. EDIT BUTTON (Absolute Top Right) */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          onClick={onEdit}
          title="Edit Homeowner Info"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>

      {/* 2. HEADER: Avatar & Name Stack */}
      <div className="flex items-start gap-3 mb-5 pr-8"> {/* pr-8 ensures name doesn't hit edit button */}
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600 mt-1">
             <User className="w-5 h-5" />
        </div>
        
        {/* Name & Project Stack */}
        <div className="flex flex-col">
          <h3 className={`font-semibold text-base leading-tight ${name ? "text-gray-900" : "text-gray-400 italic"}`}>
            {name || "Unknown Homeowner"}
          </h3>
          
          {project && (
            <div className="mt-1.5">
              <Badge variant="secondary" className="text-[10px] h-5 px-2 font-normal text-gray-500 bg-gray-100 hover:bg-gray-200 border border-gray-100">
                {project}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* 3. PROPERTY INFO (Address, Builder, Closing) */}
      <div className="space-y-3 mb-5">
        
        {/* Address */}
        <div className="flex items-start">
          <MapPin className="w-3.5 h-3.5 mt-0.5 mr-2.5 text-gray-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Address</span>
            <span className={`text-sm ${address ? "text-gray-700" : "text-gray-300 italic"}`}>
              {address || "No address listed"}
            </span>
          </div>
        </div>

        {/* Builder */}
        <div className="flex items-start">
          <Hammer className="w-3.5 h-3.5 mt-0.5 mr-2.5 text-gray-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Builder</span>
            <span className={`text-sm ${builder ? "text-gray-700" : "text-gray-300 italic"}`}>
              {builder || "--"}
            </span>
          </div>
        </div>

        {/* Closing Date */}
        <div className="flex items-start">
          <Calendar className="w-3.5 h-3.5 mt-0.5 mr-2.5 text-gray-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Closing Date</span>
            <span className={`text-sm ${closingDate ? "text-gray-700" : "text-gray-300 italic"}`}>
              {closingDate || "--"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. CONTACT INFO (Read Only) */}
      <div className="pt-4 border-t border-gray-100 mt-auto space-y-2">
         {/* Phone */}
         <div className="flex items-center text-xs">
            <Phone className="w-3.5 h-3.5 mr-2.5 text-gray-400" />
            <span className={`${phone ? "text-gray-600 font-medium" : "text-gray-300 italic"}`}>
              {phone || "No phone number"}
            </span>
         </div>

         {/* Email */}
         <div className="flex items-center text-xs">
            <Mail className="w-3.5 h-3.5 mr-2.5 text-gray-400" />
            <span className={`truncate ${email ? "text-gray-600 font-medium" : "text-gray-300 italic"}`}>
              {email || "No email address"}
            </span>
         </div>
      </div>

    </div>
  );
}
