
import React, { useState } from 'react';
import { InternalEmployee, Contractor } from '../types';
import Button from './Button';
import { Plus, Edit2, Mail, Trash2, UserCheck, Shield, X, HardHat, Briefcase, Phone } from 'lucide-react';

interface InternalUserManagementProps {
  employees: InternalEmployee[];
  onAddEmployee: (emp: InternalEmployee) => void;
  onUpdateEmployee: (emp: InternalEmployee) => void;
  onDeleteEmployee: (id: string) => void;
  
  contractors: Contractor[];
  onAddContractor: (sub: Contractor) => void;
  onUpdateContractor: (sub: Contractor) => void;
  onDeleteContractor: (id: string) => void;

  onClose: () => void;
  initialTab?: 'EMPLOYEES' | 'SUBS';
}

const InternalUserManagement: React.FC<InternalUserManagementProps> = ({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  contractors,
  onAddContractor,
  onUpdateContractor,
  onDeleteContractor,
  onClose,
  initialTab = 'EMPLOYEES'
}) => {
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'SUBS'>(initialTab);
  
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);

  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState('');

  // Sub Form State
  const [subCompany, setSubCompany] = useState('');
  const [subContact, setSubContact] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subSpecialty, setSubSpecialty] = useState('');

  // --- Employee Handlers ---
  const handleOpenCreateEmp = () => {
    setEditingEmpId(null);
    setEmpName('');
    setEmpEmail('');
    setEmpRole('Warranty Manager');
    setShowEmpModal(true);
  };

  const handleOpenEditEmp = (emp: InternalEmployee) => {
    setEditingEmpId(emp.id);
    setEmpName(emp.name);
    setEmpEmail(emp.email);
    setEmpRole(emp.role);
    setShowEmpModal(true);
  };

  const handleSubmitEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmpId) {
      onUpdateEmployee({ id: editingEmpId, name: empName, email: empEmail, role: empRole });
    } else {
      onAddEmployee({ id: crypto.randomUUID(), name: empName, email: empEmail, role: empRole });
    }
    setShowEmpModal(false);
  };

  // --- Sub Handlers ---
  const handleOpenCreateSub = () => {
    setEditingSubId(null);
    setSubCompany('');
    setSubContact('');
    setSubEmail('');
    setSubSpecialty('General');
    setShowSubModal(true);
  };

  const handleOpenEditSub = (sub: Contractor) => {
    setEditingSubId(sub.id);
    setSubCompany(sub.companyName);
    setSubContact(sub.contactName);
    setSubEmail(sub.email);
    setSubSpecialty(sub.specialty);
    setShowSubModal(true);
  };

  const handleSubmitSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubId) {
      onUpdateContractor({ id: editingSubId, companyName: subCompany, contactName: subContact, email: subEmail, specialty: subSpecialty });
    } else {
      onAddContractor({ id: crypto.randomUUID(), companyName: subCompany, contactName: subContact, email: subEmail, specialty: subSpecialty });
    }
    setShowSubModal(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]">
      <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8">
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Team & Sub Management
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">Manage internal access and trade partners.</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Tabs */}
      <div className="flex border-b border-surface-outline-variant dark:border-gray-700">
        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'EMPLOYEES' 
              ? 'border-b-2 border-primary text-primary' 
              : 'text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 hover:bg-surface-container/50 dark:hover:bg-gray-700/50'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Internal Team
        </button>
        <button
          onClick={() => setActiveTab('SUBS')}
          className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'SUBS' 
              ? 'border-b-2 border-primary text-primary' 
              : 'text-surface-on-variant hover:text-surface-on hover:bg-surface-container/50'
          }`}
        >
          <HardHat className="h-4 w-4" />
          Subs (Contractors)
        </button>
      </div>

      <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden shadow-sm">
        
        {/* ACTION BAR */}
        <div className="p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex justify-end">
          {activeTab === 'EMPLOYEES' ? (
            <Button onClick={handleOpenCreateEmp} icon={<Plus className="h-4 w-4" />}>
              Add Team Member
            </Button>
          ) : (
            <Button onClick={handleOpenCreateSub} icon={<Plus className="h-4 w-4" />}>
              Add Sub
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 text-xs uppercase tracking-wider">
                {activeTab === 'EMPLOYEES' ? (
                  <>
                    <th className="px-6 py-4 font-medium">Employee</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 font-medium">Company</th>
                    <th className="px-6 py-4 font-medium">Contact</th>
                    <th className="px-6 py-4 font-medium">Specialty</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                  </>
                )}
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
              {activeTab === 'EMPLOYEES' ? (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-secondary-on-container font-bold text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <span className="font-medium text-surface-on dark:text-gray-100 text-sm">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100">
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-on-variant dark:text-gray-400">
                      {emp.email}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEditEmp(emp)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => onDeleteEmployee(emp.id)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-error hover:bg-error/5 rounded-full"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                contractors.map(sub => (
                  <tr key={sub.id} className="hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-primary-on-container font-bold text-xs">
                          <HardHat className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-surface-on dark:text-gray-100 text-sm">{sub.companyName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-on dark:text-gray-100">
                      {sub.contactName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100">
                        {sub.specialty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-on-variant dark:text-gray-400">
                      {sub.email}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEditSub(sub)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => onDeleteContractor(sub.id)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-error hover:bg-error/5 rounded-full"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EMPLOYEE MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
          <div className="bg-surface dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                {editingEmpId ? 'Edit Team Member' : 'New Team Member'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmitEmp} className="p-6 space-y-4 bg-surface dark:bg-gray-800">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Full Name</label>
                <input type="text" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={empName} onChange={(e) => setEmpName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Email Address</label>
                <input type="email" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Role</label>
                <select className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={empRole} onChange={(e) => setEmpRole(e.target.value)}>
                  <option>Warranty Manager</option>
                  <option>Field Specialist</option>
                  <option>Admin Coordinator</option>
                  <option>Customer Support</option>
                  <option>Technical Lead</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="text" onClick={() => setShowEmpModal(false)}>Cancel</Button>
                <Button type="submit" variant="filled">{editingEmpId ? 'Save Changes' : 'Create User'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB MODAL */}
      {showSubModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
          <div className="bg-surface dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                <HardHat className="h-5 w-5 text-primary" />
                {editingSubId ? 'Edit Sub' : 'New Sub'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmitSub} className="p-6 space-y-4 bg-surface dark:bg-gray-800">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Company Name</label>
                <input type="text" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={subCompany} onChange={(e) => setSubCompany(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Contact Person</label>
                <input type="text" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={subContact} onChange={(e) => setSubContact(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Specialty</label>
                <select className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={subSpecialty} onChange={(e) => setSubSpecialty(e.target.value)}>
                  <option>General</option>
                  <option>Plumbing</option>
                  <option>HVAC</option>
                  <option>Electrical</option>
                  <option>Flooring</option>
                  <option>Drywall</option>
                  <option>Painting</option>
                  <option>Roofing</option>
                  <option>Cabinetry</option>
                  <option>Windows</option>
                  <option>Exterior</option>
                  <option>Concrete</option>
                  <option>Appliances</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Email Address</label>
                <input type="email" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="text" onClick={() => setShowSubModal(false)}>Cancel</Button>
                <Button type="submit" variant="filled">{editingSubId ? 'Save Changes' : 'Create Sub'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default InternalUserManagement;
