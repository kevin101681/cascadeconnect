import { User, MapPin, Hammer, Calendar, Phone, Mail, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HomeownerCardProps {
  name?: string;
  address?: string;
  builder?: string;
  project?: string;
  closingDate?: string;
  phone?: string;
  email?: string;
}

export function HomeownerCard({
  name,
  address,
  builder,
  project,
  closingDate,
  phone,
  email,
}: HomeownerCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300">
      
      {/* 1. HEADER: Name & Project */}
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
             <User className="w-4 h-4" />
          </div>
          <h3 className={`font-semibold text-sm truncate ${name ? "text-gray-900" : "text-gray-400 italic"}`} title={name}>
            {name || "Unknown Homeowner"}
          </h3>
        </div>
        
        {project && (
          <Badge variant="secondary" className="shrink-0 text-[10px] h-5 px-1.5 font-normal">
            {project}
          </Badge>
        )}
      </div>

      {/* 2. BODY: Info List */}
      <div className="space-y-3 mb-4">
        
        {/* Address */}
        <div className="flex items-start">
          <MapPin className="w-3.5 h-3.5 mt-0.5 mr-2 text-gray-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Address</span>
            <span className={`text-xs ${address ? "text-gray-600" : "text-gray-300 italic"}`}>
              {address || "No address listed"}
            </span>
          </div>
        </div>

        {/* Builder */}
        <div className="flex items-start">
          <Hammer className="w-3.5 h-3.5 mt-0.5 mr-2 text-gray-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Builder</span>
            <span className={`text-xs ${builder ? "text-gray-600" : "text-gray-300 italic"}`}>
              {builder || "--"}
            </span>
          </div>
        </div>

        {/* Closing Date */}
        <div className="flex items-start">
          <Calendar className="w-3.5 h-3.5 mt-0.5 mr-2 text-gray-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-1">Closing Date</span>
            <span className={`text-xs ${closingDate ? "text-gray-600" : "text-gray-300 italic"}`}>
              {closingDate || "--"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FOOTER: Contact Actions */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
        
        {/* Phone Button */}
        <a 
          href={phone ? `tel:${phone}` : undefined}
          className={`flex items-center justify-center py-1.5 rounded text-xs font-medium transition-colors border ${
            phone 
              ? "border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-blue-600 cursor-pointer" 
              : "border-transparent text-gray-300 cursor-not-allowed"
          }`}
        >
          <Phone className="w-3 h-3 mr-1.5" />
          Call
        </a>

        {/* Email Button */}
        <a 
          href={email ? `mailto:${email}` : undefined}
          className={`flex items-center justify-center py-1.5 rounded text-xs font-medium transition-colors border ${
            email 
              ? "border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-blue-600 cursor-pointer" 
              : "border-transparent text-gray-300 cursor-not-allowed"
          }`}
        >
          <Mail className="w-3 h-3 mr-1.5" />
          Email
        </a>

      </div>
    </div>
  );
}

