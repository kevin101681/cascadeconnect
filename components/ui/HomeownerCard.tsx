import { MapPin, Hammer, Calendar, Phone, Mail, Edit2, Check, Eye, Clock } from "lucide-react";
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
      className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2 py-0.5 ${config.bg} ${config.text}`}
      title={`Status: ${config.label}`}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
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
  clerkId,
  inviteEmailRead,
}: HomeownerCardProps) {
  const clientStatus = getClientStatus(clerkId, inviteEmailRead);
  
  return (
    // Material 3 Design: Using semantic rounded-card token
    <div className="bg-white dark:bg-gray-800 rounded-card border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all h-full flex flex-col relative group">
      
      {/* HEADER: Name & Project */}
      <div className="flex flex-col mb-6">
        {/* Name with Status Badge */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h3 className={`font-bold text-lg leading-tight ${name ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500 italic"}`}>
            {name || "Unknown Homeowner"}
          </h3>
          <ClientStatusBadge status={clientStatus} />
        </div>
        
        {project && (
          <div>
            <Badge variant="secondary" className="text-[10px] h-5 px-2 font-normal text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600">
              {project}
            </Badge>
          </div>
        )}
      </div>

      {/* 3. UNIFIED INFO LIST */}
      <div className="space-y-4">
        
        {/* Address */}
        <div className="flex items-start group/item">
          <MapPin className="w-4 h-4 mt-0.5 mr-3 text-gray-400 dark:text-gray-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Address</span>
            <span className={`text-sm leading-snug ${address ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`}>
              {address || "No address listed"}
            </span>
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
          <Hammer className="w-4 h-4 mt-0.5 mr-3 text-gray-400 dark:text-gray-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Builder</span>
            <span className={`text-sm ${builder ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`}>
              {builder || "--"}
            </span>
          </div>
        </div>

        {/* Closing Date */}
        <div className="flex items-start group/item">
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
