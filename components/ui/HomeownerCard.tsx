import { MapPin, Home, Calendar, Phone, Mail, Edit2, Check, Eye, Clock, Pencil, HardHat } from "lucide-react";
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
  onViewAs?: () => void;
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

// Status badge component
interface StatusBadgeProps {
  status: ClientStatus;
}

const ClientStatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const configs = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      icon: Check,
      label: 'Active',
    },
    invite_read: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      icon: Eye,
      label: 'Viewed',
    },
    pending: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-800 dark:text-gray-300',
      icon: Clock,
      label: 'Pending',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-xs font-medium w-5 h-5 ${config.bg} ${config.text}`}
      title={`Status: ${config.label}`}
    >
      <Icon className="h-3 w-3" />
    </span>
  );
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
  onViewAs,
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
  
  return (
    // Material 3 Design: Using semantic rounded-card token
    <div className="bg-white dark:bg-gray-800 rounded-card border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all h-full flex flex-col relative group">
      
      {/* Action Buttons - Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
        {/* Subs Button */}
        {onViewSubs && (
          <Button
            size="icon"
            variant="outline"
            className="rounded-full h-8 w-8 bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/50"
            onClick={(e) => {
              e.stopPropagation();
              console.log("🔨 View Subs Clicked for:", name);
              if (onViewSubs) onViewSubs();
            }}
            title="View Subcontractors"
          >
            <HardHat className="h-4 w-4" />
          </Button>
        )}

        {/* View As Button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-transparent dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation(); // CRITICAL: Stop card collapse
            console.log("👁️ View As Clicked for:", name); // CRITICAL: Log verification
            if (onViewAs) onViewAs();
          }}
          title="View As Homeowner"
        >
          <Eye className="h-4 w-4" />
        </Button>

        {/* Edit Button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-transparent dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            console.log("✏️ Edit Clicked");
            if (onEdit) onEdit();
          }}
          title="Edit Homeowner"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {/* HEADER: Name with Status Icon & Project */}
      <div className="flex flex-col mb-6 pr-20">
        {/* Name + Status Icon Row */}
        <div className="flex items-center gap-2 mb-2">
          <h3 className={`font-bold text-lg leading-tight ${name ? "text-primary dark:text-primary" : "text-gray-400 dark:text-gray-500 italic"}`}>
            {name || "Unknown Homeowner"}
          </h3>
          <ClientStatusBadge status={clientStatus} />
        </div>
          {project && (
            <Badge variant="secondary" className="text-[10px] h-5 px-2 font-normal text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600">
              {project}
            </Badge>
          )}
        </div>
      </div>

      {/* UNIFIED INFO LIST */}
      <div className="space-y-4">
        
        {/* Address */}
        <div className="flex items-start group/item">
          <MapPin className="w-4 h-4 mt-0.5 mr-3 text-gray-400 dark:text-gray-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors shrink-0" />
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
          <Phone className="w-4 h-4 mt-0.5 mr-3 text-gray-400 dark:text-gray-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Phone</span>
            <span className={`text-sm ${phone ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-300 dark:text-gray-600 italic"}`}>
              {phone || "--"}
            </span>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start group/item">
          <Mail className="w-4 h-4 mt-0.5 mr-3 text-gray-400 dark:text-gray-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Email</span>
            <span className={`text-sm truncate block ${email ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`} title={email}>
              {email || "--"}
            </span>
          </div>
        </div>

        {/* Builder */}
        <div className="flex items-start group/item">
          <Home className="w-4 h-4 mt-0.5 mr-3 text-gray-400 dark:text-gray-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Builder</span>
            <span className={`text-sm ${builder ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`}>
              {builder || "--"}
            </span>
          </div>
        </div>

        {/* Closing Date */}
        <div className="flex items-start group/item mt-4">
          <Calendar className="w-4 h-4 mt-0.5 mr-3 text-gray-400 dark:text-gray-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Closing Date</span>
            <span className={`text-sm ${closingDate ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`}>
              {closingDate || "--"}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
