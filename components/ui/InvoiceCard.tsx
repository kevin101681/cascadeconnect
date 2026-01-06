import { FileText, Calendar, MapPin, Hammer, Mail, Download, Trash2, Check, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InvoiceCardProps {
  invoiceNumber: string;
  status: "Draft" | "Sent" | "Overdue" | "Paid";
  amount: string; // e.g., "$1,200.00"
  createdDate: string;
  dueDate: string;
  builder?: string;
  address?: string;
  checkNumber?: string;
  onMarkPaid?: (checkNum: string) => void;
  onEmail?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

export function InvoiceCard({
  invoiceNumber,
  status,
  amount,
  createdDate,
  dueDate,
  builder,
  address,
  checkNumber = "",
  onMarkPaid,
  onEmail,
  onDownload,
  onDelete,
}: InvoiceCardProps) {
  
  // Helper for Status Badge Colors
  const getStatusColor = (s: string) => {
    switch (s) {
      case "Paid": return "bg-green-100 text-green-700 hover:bg-green-100";
      case "Overdue": return "bg-red-100 text-red-700 hover:bg-red-100";
      case "Sent": return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      default: return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    }
  };

  const isPaid = status === "Paid";

  return (
    <div className="group relative bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300 flex flex-col h-full">
      
      {/* 1. HEADER: Invoice #, Status, Amount */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 text-sm">{invoiceNumber}</span>
            <Badge className={`rounded-sm px-1.5 py-0 text-[10px] uppercase font-bold border-0 ${getStatusColor(status)}`}>
              {status}
            </Badge>
          </div>
          {/* Big Amount Display */}
          <div className="flex items-center text-gray-900 font-bold text-lg">
            {amount}
          </div>
        </div>
      </div>

      {/* 2. BODY: Context Info (Builder/Address) */}
      <div className="space-y-2 mb-4">
         {/* Builder */}
         <div className="flex items-start">
            <Hammer className="w-3.5 h-3.5 mt-0.5 mr-2 text-gray-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">Builder</span>
              <span className="text-xs text-gray-700 truncate">{builder || "--"}</span>
            </div>
          </div>
          
          {/* Address */}
          <div className="flex items-start">
            <MapPin className="w-3.5 h-3.5 mt-0.5 mr-2 text-gray-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">Project Address</span>
              <span className="text-xs text-gray-700 truncate">{address || "--"}</span>
            </div>
          </div>
      </div>

      {/* 3. DATES GRID */}
      <div className="grid grid-cols-2 gap-2 mb-4 pt-3 border-t border-gray-50">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Created</span>
          <div className="flex items-center text-xs text-gray-600">
            <FileText className="w-3 h-3 mr-1.5 text-gray-400" />
            {createdDate}
          </div>
        </div>
        <div className="flex flex-col border-l border-gray-100 pl-2">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Due Date</span>
          <div className={`flex items-center text-xs font-medium ${status === 'Overdue' ? 'text-red-600' : 'text-gray-600'}`}>
            <Calendar className={`w-3 h-3 mr-1.5 ${status === 'Overdue' ? 'text-red-500' : 'text-gray-400'}`} />
            {dueDate}
          </div>
        </div>
      </div>

      {/* 4. FOOTER: Actions & Input */}
      <div className="mt-auto pt-3 border-t border-gray-100 bg-gray-50/50 -mx-4 -mb-4 p-4 rounded-b-lg">
        
        {/* Check Number Field */}
        <div className="mb-3">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">
            {isPaid ? "Paid via Check #" : "Record Payment (Check #)"}
          </label>
          <div className="relative">
             <Input 
                defaultValue={checkNumber}
                disabled={isPaid}
                placeholder="Enter check number..."
                className="h-8 text-xs bg-white pr-8"
             />
             {isPaid && <Check className="w-3 h-3 text-green-500 absolute right-3 top-2.5" />}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 justify-between">
          {/* Primary Action */}
          {!isPaid ? (
            <Button 
              size="sm" 
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white flex-1"
              onClick={() => onMarkPaid?.(checkNumber)}
            >
              Mark as Paid
            </Button>
          ) : (
             <Button size="sm" variant="outline" className="h-8 text-xs flex-1 cursor-default bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-50">
                Paid
             </Button>
          )}

          {/* Secondary Actions (Icon Only) */}
          <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50" title="Email PDF" onClick={onEmail}>
                <Mail className="w-3.5 h-3.5" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50" title="Download PDF" onClick={onDownload}>
                <Download className="w-3.5 h-3.5" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete Invoice" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
             </Button>
          </div>
        </div>
      </div>

    </div>
  );
}

