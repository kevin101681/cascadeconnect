import React, { useState } from 'react';
import { InternalEmployee } from '../types';
import Button from './Button';
import { Plus, Edit2, Mail, Trash2, UserCheck, Shield } from 'lucide-react';

interface InternalUserManagementProps {
  employees: InternalEmployee[];
  onAddEmployee: (emp: InternalEmployee) => void;
  onUpdateEmployee: (emp: InternalEmployee) => void;
  onDeleteEmployee: (id: string) => void;
}

const InternalUserManagement: React.FC<InternalUserManagementProps> = ({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setRole('Warranty Manager');
    setShowModal(true);
  };

  const handleOpenEdit = (emp: InternalEmployee) => {
    setEditingId(emp.id);
    setName(emp.name);
    setEmail(emp.email);
    setRole(emp.role);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateEmployee({ id: editingId, name, email, role });
    } else {
      onAddEmployee({ id: `emp-${Date.now()}`, name, email, role });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-lg font-normal text-surface-on flex items-center gap-2">
             <Shield className="h-5 w-5 text-primary" />
             Internal Team Members
           </h3>
           <p className="text-sm text-surface-on-variant">Manage employee access and roles.</p>
        </div>
        <Button onClick={handleOpenCreate} icon={<Plus className="h-4 w-4" />}>
          Add Member
        </Button>
      </div>

      <div className="bg-surface rounded-3xl border border-surface-outline-variant overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-surface-on-variant text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-outline-variant">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-surface-container-high transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-secondary-on-container font-bold text-xs">
                        {emp.name.charAt(0)}
                      </div>
                      <span className="font-medium text-surface-on text-sm">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-surface-on">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-on-variant">
                    {emp.email}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1.5 text-surface-outline-variant hover:text-primary hover:bg-primary/5 rounded-full"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                         onClick={() => onDeleteEmployee(emp.id)}
                         className="p-1.5 text-surface-outline-variant hover:text-error hover:bg-error/5 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-md rounded-3xl shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-outline-variant bg-surface-container">
              <h2 className="text-lg font-normal text-surface-on flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                {editingId ? 'Edit Team Member' : 'New Team Member'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-on-variant mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-on-variant mb-1">Role</label>
                <select 
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-surface-on border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option>Warranty Manager</option>
                  <option>Field Specialist</option>
                  <option>Admin Coordinator</option>
                  <option>Customer Support</option>
                  <option>Technical Lead</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="text" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="filled">
                  {editingId ? 'Save Changes' : 'Create User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalUserManagement;