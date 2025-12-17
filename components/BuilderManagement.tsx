
import React, { useState } from 'react';
import { BuilderGroup, BuilderUser, UserRole } from '../types';
import Button from './Button';
import { Plus, Edit2, Trash2, Building2, User, X, Lock } from 'lucide-react';

interface BuilderManagementProps {
  builderGroups: BuilderGroup[];
  builderUsers: BuilderUser[]; // Still passed but not used in this component anymore
  onAddGroup: (group: BuilderGroup) => void;
  onUpdateGroup: (group: BuilderGroup) => void;
  onDeleteGroup: (id: string) => void;
  onAddUser: (user: BuilderUser, password?: string) => void; // Kept for compatibility
  onUpdateUser: (user: BuilderUser, password?: string) => void; // Kept for compatibility
  onDeleteUser: (id: string) => void; // Kept for compatibility
  onClose: () => void;
}

const BuilderManagement: React.FC<BuilderManagementProps> = ({
  builderGroups,
  builderUsers: _builderUsers, // Unused - builder users are in InternalUserManagement
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddUser: _onAddUser, // Unused
  onUpdateUser: _onUpdateUser, // Unused
  onDeleteUser: _onDeleteUser, // Unused
  onClose
}) => {
  // Removed USERS tab - builder users are now in InternalUserManagement
  
  // Group Form State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupEmail, setGroupEmail] = useState('');


  // Group Handlers
  const handleOpenCreateGroup = () => {
    setEditingGroupId(null);
    setGroupName('');
    setGroupEmail('');
    setShowGroupModal(true);
  };

  const handleOpenEditGroup = (group: BuilderGroup) => {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupEmail(group.email || '');
    setShowGroupModal(true);
  };

  const handleSubmitGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroupId) {
      onUpdateGroup({ id: editingGroupId, name: groupName, email: groupEmail });
    } else {
      onAddGroup({ id: crypto.randomUUID(), name: groupName, email: groupEmail });
    }
    setShowGroupModal(false);
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]">
      <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8 min-h-[600px] flex flex-col">
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Builder Management
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">Manage builder companies and client access.</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto flex-1">
      {/* Tabs */}
      <div className="flex border-b border-surface-outline-variant dark:border-gray-700">
        <button
          className="px-6 py-3 text-sm font-medium border-b-2 border-primary text-primary flex items-center gap-2"
        >
          <Building2 className="h-4 w-4" />
          Builders
        </button>
      </div>

      <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden shadow-sm">
        
        {/* ACTION BAR */}
        <div className="p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex justify-end">
          <Button onClick={handleOpenCreateGroup} icon={<Plus className="h-4 w-4" />}>
            Add Builder
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Company Name</th>
                <th className="px-6 py-4 font-medium">Main Contact Email</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
              {builderGroups.map(group => (
                <tr key={group.id} className="hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-primary-on-container font-bold text-xs">
                        {group.name.charAt(0)}
                      </div>
                      <span className="font-medium text-surface-on dark:text-gray-100 text-sm">{group.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-on-variant dark:text-gray-400">
                    {group.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEditGroup(group)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => onDeleteGroup(group.id)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-error hover:bg-error/5 rounded-full"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GROUP MODAL */}
      {showGroupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
          <div className="bg-surface dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {editingGroupId ? 'Edit Builder Group' : 'New Builder Group'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmitGroup} className="p-6 space-y-4 bg-surface dark:bg-gray-800">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Company Name</label>
                <input type="text" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Email Address (Optional)</label>
                <input type="email" className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={groupEmail} onChange={(e) => setGroupEmail(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="text" onClick={() => setShowGroupModal(false)}>Cancel</Button>
                <Button type="submit" variant="filled">{editingGroupId ? 'Save Changes' : 'Create Group'}</Button>
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

export default BuilderManagement;
