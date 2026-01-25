import { MapPin, Home, Calendar, Phone, Mail, Check, Clock, Pencil, HardHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Client status type
type ClientStatus = 'active' | 'invite_read' | 'pending';

interface HomeownerCardProps {
  name?: string;
  address?: string;
  builder?: string;
  project?: string;
  closingDate?: string;
  phone?: string;
  email?: string;
  onEdit?: () => void;
  onViewSubs?: () => void;
  // Status tracking
  clerkId?: string;
  inviteEmailRead?: boolean;
}

// Helper to determine status
const getClientStatus = (clerkId?: string, inviteEmailRead?: boolean): ClientStatus => {
  if (clerkId) return 'active';
  if (inviteEmailRead) return 'invite_read';
  return 'pending';
};

export function HomeownerCard({
  name,
  address,
  builder,
  project,
  closingDate,
  phone,
  email,
  onEdit,
  onViewSubs,
  clerkId,
  inviteEmailRead,
}: HomeownerCardProps) {
  const clientStatus = getClientStatus(clerkId, inviteEmailRead);
  
  // Format address: Split at first comma for better display
  const formatAddress = (addr?: string) => {
    if (!addr) return { line1: "No address listed", line2: null };
    
    const firstCommaIndex = addr.indexOf(',');
    if (firstCommaIndex === -1) {
      // No comma found, return as single line
      return { line1: addr, line2: null };
    }
    
    // Split at first comma
    const line1 = addr.substring(0, firstCommaIndex).trim();
    const line2 = addr.substring(firstCommaIndex + 1).trim();
    
    return { line1, line2 };
  };
  
  const formattedAddress = formatAddress(address);
  
  // Smart name stacking for couples
  const parseNameForCouples = (fullName?: string) => {
    if (!fullName) return { line1: "Unknown Homeowner", line2: null, isSingleLine: true };
    
    // Look for " and " or " & " (case-insensitive)
    const andRegex = /\s+(?:and|&)\s+/i;
    const match = fullName.match(andRegex);
    
    if (match) {
      // Found a couple indicator
      const splitIndex = match.index!;
      const line1 = fullName.substring(0, splitIndex).trim();
      const line2 = fullName.substring(splitIndex + match[0].length).trim();
      return { line1, line2: `& ${line2}`, isSingleLine: false };
    }
    
    // Not a couple - check length for safety
    const isSingleLine = fullName.length <= 30;
    return { line1: fullName, line2: null, isSingleLine };
  };
  
  const parsedName = parseNameForCouples(name);
  
  return (
    // Material 3 Design: Using semantic rounded-card token
    <div className="bg-white dark:bg-gray-800 rounded-card border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all h-full flex flex-col group">
      
      {/* HEADER: Name & Project - FULL WIDTH */}
      <div className="flex flex-col mb-4">
        {/* Name Row - Uses full width */}
        <div className="mb-3">
          {parsedName.line2 ? (
            // Couple name - stacked (now has full width)
            <div className="space-y-1">
              <h3 className="font-bold text-lg leading-tight text-primary dark:text-primary">
                {parsedName.line1}
              </h3>
              <h3 className="font-bold text-base leading-tight text-gray-600 dark:text-gray-400">
                {parsedName.line2}
              </h3>
            </div>
          ) : (
            // Single name (now has full width)
            <h3 className={`font-bold text-lg leading-tight ${name ? "text-primary dark:text-primary" : "text-gray-400 dark:text-gray-500 italic"}`}>
              {parsedName.line1}
            </h3>
          )}
        </div>
        {project && (
          <span className="text-[10px] font-normal text-gray-600 dark:text-gray-300 w-fit">
            {project}
          </span>
        )}
      </div>

      {/* UNIFIED INFO LIST */}
      <div className="space-y-4">
        
        {/* Address */}
        <div className="flex items-start group/item">
          <MapPin className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Address</span>
            <div className={`text-sm leading-snug ${address ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`}>
              <div>{formattedAddress.line1}</div>
              {formattedAddress.line2 && (
                <div>{formattedAddress.line2}</div>
              )}
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start group/item">
          <Phone className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Phone</span>
            <span className={`text-sm ${phone ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-300 dark:text-gray-600 italic"}`}>
              {phone || "--"}
            </span>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start group/item">
          <Mail className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Email</span>
            <span className={`text-sm truncate block ${email ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`} title={email}>
              {email || "--"}
            </span>
          </div>
        </div>

        {/* Builder */}
        <div className="flex items-start group/item">
          <Home className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Builder</span>
            <span className={`text-sm ${builder ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`}>
              {builder || "--"}
            </span>
          </div>
        </div>

        {/* Closing Date */}
        <div className="flex items-start group/item mt-4">
          <Calendar className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Closing Date</span>
            <span className={`text-sm ${closingDate ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`}>
              {closingDate || "--"}
            </span>
          </div>
        </div>

      </div>

      {/* FOOTER: Status Badge & Action Buttons */}
      <div className="border-t border-gray-100 dark:border-gray-700 mt-4 pt-4 flex justify-between items-center">
        {/* Left Side: Status Badge with Text */}
        <div className="flex items-center gap-2">
          {(() => {
            const statusConfigs = {
              active: {
                text: 'text-green-600 dark:text-green-400',
                icon: Check,
                label: 'Active',
              },
              invite_read: {
                text: 'text-blue-600 dark:text-blue-400',
                icon: Check,
                label: 'Viewed',
              },
              pending: {
                text: 'text-gray-500 dark:text-gray-400',
                icon: Clock,
                label: 'Pending',
              },
            };
            const config = statusConfigs[clientStatus];
            const Icon = config.icon;
            
            return (
              <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
                <Icon className="h-3.5 w-3.5" />
                <span>{config.label}</span>
              </div>
            );
          })()}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View Subs Button */}
          {onViewSubs && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/50"
              onClick={(e) => {
                e.stopPropagation();
                console.log("🔨 View Subs Clicked for:", name);
                if (onViewSubs) onViewSubs();
              }}
            >
              <HardHat className="h-3.5 w-3.5 mr-1.5" />
              Subs
            </Button>
          )}

          {/* Edit Button */}
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                console.log("✏️ Edit Clicked");
                if (onEdit) onEdit();
              }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit Info
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
