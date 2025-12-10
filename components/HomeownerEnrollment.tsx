import React, { useState } from 'react';
import Button from './Button';
import { Homeowner, HomeownerDocument } from '../types';
import { UserPlus, Home, User, Calendar, FileText, Upload, X, Building2, MapPin } from 'lucide-react';

interface HomeownerEnrollmentProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (data: Partial<Homeowner>, tradeListFile: File | null) => void;
}

const HomeownerEnrollment: React.FC<HomeownerEnrollmentProps> = ({ isOpen, onClose, onEnroll }) => {
  // Buyer 1
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Buyer 2
  const [buyer2Phone, setBuyer2Phone] = useState('');
  const [buyer2Email, setBuyer2Email] = useState('');

  // Property
  const [builderName, setBuilderName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // Agent
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');

  // Dates & Other
  const [closingDate, setClosingDate] = useState('');
  const [walkThroughDate, setWalkThroughDate] = useState('');
  const [comments, setComments] = useState('');
  const [tradeFile, setTradeFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newHomeowner: Partial<Homeowner> = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      phone,
      buyer2Email,
      buyer2Phone,
      builder: builderName,
      projectOrLlc: projectName,
      lotNumber,
      address: `${address}, ${city}, ${state} ${zip}`,
      city,
      state,
      zip,
      agentName,
      agentEmail,
      agentPhone,
      closingDate: new Date(closingDate),
      preferredWalkThroughDate: walkThroughDate ? new Date(walkThroughDate) : undefined,
      enrollmentComments: comments
    };
    
    onEnroll(newHomeowner, tradeFile);
    onClose();
  };

  if (!isOpen) return null;

  const inputClass = "w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder-surface-outline-variant";
  const labelClass = "block text-xs font-medium text-surface-on-variant mb-1";
  const sectionClass = "bg-surface-container/30 p-4 rounded-xl border border-surface-outline-variant/50";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface w-full max-w-4xl rounded-3xl shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-surface-outline-variant bg-surface-container flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-normal text-surface-on flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-primary" />
              Enroll New Homeowner
            </h2>
            <p className="text-sm text-surface-on-variant mt-1">Builder Client Submission Form</p>
          </div>
          <button onClick={onClose} className="text-surface-on-variant hover:text-surface-on p-2 rounded-full hover:bg-white/10">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: Buyers & Agent */}
            <div className="space-y-6">
               <div className={sectionClass}>
                 <h3 className="text-sm font-bold text-surface-on mb-4 flex items-center gap-2">
                   <User className="h-4 w-4 text-primary" />
                   Buyer 1 Information (Primary)
                 </h3>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className={labelClass}>First Name *</label>
                     <input type="text" required className={inputClass} value={firstName} onChange={e => setFirstName(e.target.value)} />
                   </div>
                   <div>
                     <label className={labelClass}>Last Name *</label>
                     <input type="text" required className={inputClass} value={lastName} onChange={e => setLastName(e.target.value)} />
                   </div>
                   <div className="col-span-2">
                     <label className={labelClass}>Email Address *</label>
                     <input type="email" required className={inputClass} value={email} onChange={e => setEmail(e.target.value)} />
                   </div>
                   <div className="col-span-2">
                     <label className={labelClass}>Phone Number *</label>
                     <input type="tel" required className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} />
                   </div>
                 </div>
               </div>

               <div className={sectionClass}>
                 <h3 className="text-sm font-bold text-surface-on mb-4 flex items-center gap-2">
                   <User className="h-4 w-4 text-primary opacity-50" />
                   Buyer 2 Information (Optional)
                 </h3>
                 <div className="grid grid-cols-1 gap-3">
                   <div>
                     <label className={labelClass}>Phone Number</label>
                     <input type="tel" className={inputClass} value={buyer2Phone} onChange={e => setBuyer2Phone(e.target.value)} />
                   </div>
                   <div>
                     <label className={labelClass}>Email Address</label>
                     <input type="email" className={inputClass} value={buyer2Email} onChange={e => setBuyer2Email(e.target.value)} />
                   </div>
                 </div>
               </div>

               <div className={sectionClass}>
                 <h3 className="text-sm font-bold text-surface-on mb-4 flex items-center gap-2">
                   <User className="h-4 w-4 text-secondary" />
                   Buyer's Agent
                 </h3>
                 <div className="space-y-3">
                   <div>
                     <label className={labelClass}>Agent Name</label>
                     <input type="text" className={inputClass} value={agentName} onChange={e => setAgentName(e.target.value)} />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className={labelClass}>Phone</label>
                       <input type="tel" className={inputClass} value={agentPhone} onChange={e => setAgentPhone(e.target.value)} />
                     </div>
                     <div>
                       <label className={labelClass}>Email</label>
                       <input type="email" className={inputClass} value={agentEmail} onChange={e => setAgentEmail(e.target.value)} />
                     </div>
                   </div>
                 </div>
               </div>
            </div>

            {/* Column 2: Property & Meta */}
            <div className="space-y-6">
              <div className={sectionClass}>
                 <h3 className="text-sm font-bold text-surface-on mb-4 flex items-center gap-2">
                   <Building2 className="h-4 w-4 text-primary" />
                   Property Details
                 </h3>
                 <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Builder's Name *</label>
                      <input type="text" required className={inputClass} value={builderName} onChange={e => setBuilderName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div>
                         <label className={labelClass}>Project Name / LLC</label>
                         <input type="text" className={inputClass} value={projectName} onChange={e => setProjectName(e.target.value)} />
                       </div>
                       <div>
                         <label className={labelClass}>Lot / Unit # *</label>
                         <input type="text" required className={inputClass} value={lotNumber} onChange={e => setLotNumber(e.target.value)} />
                       </div>
                    </div>
                    <div>
                      <label className={labelClass}>Street Address *</label>
                      <input type="text" required className={inputClass} value={address} onChange={e => setAddress(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-6 gap-3">
                       <div className="col-span-3">
                         <label className={labelClass}>City *</label>
                         <input type="text" required className={inputClass} value={city} onChange={e => setCity(e.target.value)} />
                       </div>
                       <div className="col-span-1">
                         <label className={labelClass}>State</label>
                         <input type="text" required className={inputClass} value={state} onChange={e => setState(e.target.value)} />
                       </div>
                       <div className="col-span-2">
                         <label className={labelClass}>Zip *</label>
                         <input type="text" required className={inputClass} value={zip} onChange={e => setZip(e.target.value)} />
                       </div>
                    </div>
                 </div>
               </div>

               <div className={sectionClass}>
                 <h3 className="text-sm font-bold text-surface-on mb-4 flex items-center gap-2">
                   <Calendar className="h-4 w-4 text-primary" />
                   Important Dates
                 </h3>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className={labelClass}>Closing Date *</label>
                     <input type="date" required className={inputClass} value={closingDate} onChange={e => setClosingDate(e.target.value)} />
                   </div>
                   <div>
                     <label className={labelClass}>Preferred Walk Through</label>
                     <input type="date" className={inputClass} value={walkThroughDate} onChange={e => setWalkThroughDate(e.target.value)} />
                   </div>
                 </div>
               </div>

               <div className={sectionClass}>
                 <h3 className="text-sm font-bold text-surface-on mb-4 flex items-center gap-2">
                   <FileText className="h-4 w-4 text-primary" />
                   Documentation
                 </h3>
                 <div className="space-y-4">
                   <div>
                     <label className={labelClass}>Trade Contractor List (Upload)</label>
                     <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-surface-outline-variant border-dashed rounded-xl hover:bg-surface-container transition-colors">
                       <div className="space-y-1 text-center">
                         <Upload className="mx-auto h-8 w-8 text-surface-outline-variant" />
                         <div className="flex text-sm text-surface-on-variant">
                           <label className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
                             <span>Upload a file</span>
                             <input type="file" className="sr-only" onChange={(e) => setTradeFile(e.target.files?.[0] || null)} />
                           </label>
                           <p className="pl-1">or drag and drop</p>
                         </div>
                         <p className="text-xs text-surface-outline-variant">
                            {tradeFile ? tradeFile.name : 'PDF, DOC, XLS up to 10MB'}
                         </p>
                       </div>
                     </div>
                   </div>

                   <div>
                     <label className={labelClass}>Additional Comments</label>
                     <textarea 
                        rows={3} 
                        className={inputClass} 
                        value={comments} 
                        onChange={e => setComments(e.target.value)}
                        placeholder="Any special instructions..."
                      />
                   </div>
                 </div>
               </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-surface-outline-variant">
            <Button type="button" variant="text" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="filled" icon={<UserPlus className="h-4 w-4" />}>
              Submit Enrollment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HomeownerEnrollment;