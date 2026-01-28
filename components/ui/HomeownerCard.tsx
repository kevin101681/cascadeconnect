import React, { useState } from "react";
import { MapPin, Home, Calendar, Phone, Mail, Check, Clock, Pencil, HardHat, Save, X } from "lucide-react";
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
  onSave?: (updates: { name?: string; project?: string; email?: string; phone?: string; address?: string }) => void;
  // Status tracking
  clerkId?: string;
  inviteEmailRead?: boolean;
  enableInlineEdit?: boolean; // NEW: Enable inline editing instead of modal
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
  onSave,
  clerkId,
  inviteEmailRead,
  enableInlineEdit = false,
}: HomeownerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name || '');
  const [editProject, setEditProject] = useState(project || '');
  const [editEmail, setEditEmail] = useState(email || '');
  const [editPhone, setEditPhone] = useState(phone || '');
  const [editAddress, setEditAddress] = useState(address || '');
  
  const clientStatus = getClientStatus(clerkId, inviteEmailRead);
  
  // Sync local state when props change
  React.useEffect(() => {
    setEditName(name || '');
    setEditProject(project || '');
    setEditEmail(email || '');
    setEditPhone(phone || '');
    setEditAddress(address || '');
  }, [name, project, email, phone, address]);
  
  const handleStartEdit = () => {
    if (enableInlineEdit) {
      setIsEditing(true);
    } else if (onEdit) {
      onEdit();
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to original values
    setEditName(name || '');
    setEditProject(project || '');
    setEditEmail(email || '');
    setEditPhone(phone || '');
    setEditAddress(address || '');
  };
  
  const handleSaveEdit = () => {
    if (onSave) {
      onSave({
        name: editName,
        project: editProject,
        email: editEmail,
        phone: editPhone,
        address: editAddress,
      });
    }
    setIsEditing(false);
  };
  
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
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-9 px-3 text-lg font-bold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-primary dark:text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Homeowner Name"
            />
          ) : parsedName.line2 ? (
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
        {isEditing ? (
          <input
            type="text"
            value={editProject}
            onChange={(e) => setEditProject(e.target.value)}
            className="w-full h-8 px-3 text-base font-medium rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            placeholder="Project Name"
          />
        ) : project ? (
          <span className="text-base font-medium text-gray-900 dark:text-gray-100 w-fit">
            {project}
          </span>
        ) : null}
      </div>

      {/* UNIFIED INFO LIST */}
      <div className="space-y-4">
        
        {/* Email */}
        <div className="flex items-start group/item">
          <Mail className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Email</span>
            {isEditing ? (
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full h-8 px-2 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="email@example.com"
              />
            ) : (
              <span className={`text-sm truncate block ${email ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`} title={email}>
                {email || "--"}
              </span>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start group/item">
          <Phone className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors shrink-0" />
          <div className="flex flex-col flex-1">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Phone</span>
            {isEditing ? (
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full h-8 px-2 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="(555) 123-4567"
              />
            ) : (
              <span className={`text-sm ${phone ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-300 dark:text-gray-600 italic"}`}>
                {phone || "--"}
              </span>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start group/item">
          <MapPin className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 group-hover/item:text-blue-500 dark:group-hover/item:text-blue-400 transition-colors shrink-0" />
          <div className="flex flex-col flex-1">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none mb-1">Address</span>
            {isEditing ? (
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full h-8 px-2 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="123 Main St, City, ST 12345"
              />
            ) : (
              <div className={`text-sm leading-snug ${address ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 italic"}`}>
                <div>{formattedAddress.line1}</div>
                {formattedAddress.line2 && (
                  <div>{formattedAddress.line2}</div>
                )}
              </div>
            )}
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
        {!isEditing && (
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
        )}

        {/* Right Side: Action Buttons */}
        <div className={`flex items-center gap-2 ${isEditing ? 'w-full justify-end' : ''}`}>
          {isEditing ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-medium flex items-center justify-center gap-2 h-8 text-xs"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit();
                }}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 shadow-sm hover:text-primary hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-xl font-medium flex items-center justify-center gap-2 h-8 text-xs"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
            </>
          ) : (
            <>
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
              {(onEdit || enableInlineEdit) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("✏️ Edit Clicked");
                    handleStartEdit();
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit Info
                </Button>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
