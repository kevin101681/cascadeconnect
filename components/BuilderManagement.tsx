
import React, { useState } from 'react';
import { BuilderGroup, BuilderUser, UserRole } from '../types';
import Button from './Button';
import { Plus, Edit2, Trash2, Building2, User, X, Lock } from 'lucide-react';

interface BuilderManagementProps {
  builderGroups: BuilderGroup[];
  builderUsers: BuilderUser[];
  onAddGroup: (group: BuilderGroup) => void;
  onUpdateGroup: (group: BuilderGroup) => void;
  onDeleteGroup: (id: string) => void;
  onAddUser: (user: BuilderUser, password?: string) => void;
  onUpdateUser: (user: BuilderUser, password?: string) => void;
  onDeleteUser: (id: string) => void;
  onClose: () => void;
}

const BuilderManagement: React.FC<BuilderManagementProps> = ({
  builderGroups,
  builderUsers,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'GROUPS' | 'USERS'>('GROUPS');
  
  // Group Form State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupEmail, setGroupEmail] = useState('');

  // User Form State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userGroupId, setUserGroupId] = useState('');

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

  // User Handlers
  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setUserName('');
    setUserEmail('');
    setUserPassword(''); // Clear password
    setUserGroupId(builderGroups.length > 0 ? builderGroups[0].id : '');
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: BuilderUser) => {
    setEditingUserId(user.id);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserPassword(''); // Clear password (don't show existing)
    setUserGroupId(user.builderGroupId);
    setShowUserModal(true);
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId) {
      onUpdateUser({ 
        id: editingUserId, 
        name: userName, 
        email: userEmail, 
        builderGroupId: userGroupId, 
        role: UserRole.BUILDER 
      }, userPassword);
    } else {
      onAddUser({ 
        id: crypto.randomUUID(), 
        name: userName, 
        email: userEmail, 
        builderGroupId: userGroupId, 
        role: UserRole.BUILDER 
      }, userPassword);
    }
    setShowUserModal(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]">
      <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8">
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

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Tabs */}
      <div className="flex border-b border-surface-outline-variant dark:border-gray-700">
        <button
          onClick={() => setActiveTab('GROUPS')}
          className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'GROUPS' 
              ? 'border-b-2 border-primary text-primary' 
              : 'text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 hover:bg-surface-container/50 dark:hover:bg-gray-700/50'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Builder Groups (Companies)
        </button>
        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'USERS' 
              ? 'border-b-2 border-primary text-primary' 
              : 'text-surface-on-variant hover:text-surface-on hover:bg-surface-container/50'
          }`}
        >
          <User className="h-4 w-4" />
          Builder Users
        </button>
      </div>

      <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden shadow-sm">
        
        {/* ACTION BAR */}
        <div className="p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex justify-end">
          {activeTab === 'GROUPS' ? (
            <Button onClick={handleOpenCreateGroup} icon={<Plus className="h-4 w-4" />}>
              Add Builder Group
            </Button>
          ) : (
            <Button onClick={handleOpenCreateUser} icon={<Plus className="h-4 w-4" />} disabled={builderGroups.length === 0}>
              Add Builder User
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 text-xs uppercase tracking-wider">
                {activeTab === 'GROUPS' ? (
                  <>
                    <th className="px-6 py-4 font-medium">Company Name</th>
                    <th className="px-6 py-4 font-medium">Main Contact Email</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 font-medium">User Name</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Assigned Group</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-outline-variant dark:divide-gray-700">
              {activeTab === 'GROUPS' ? (
                builderGroups.map(group => (
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
                ))
              ) : (
                builderUsers.map(user => {
                  const groupName = builderGroups.find(g => g.id === user.builderGroupId)?.name || 'Unknown';
                  return (
                    <tr key={user.id} className="hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors group">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-secondary-on-container font-bold text-xs">
                            {user.name.charAt(0)}
                          </div>
                          <span className="font-medium text-surface-on dark:text-gray-100 text-sm">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-on-variant dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-100 border border-surface-outline-variant dark:border-gray-600">
                          {groupName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenEditUser(user)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => onDeleteUser(user.id)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-error hover:bg-error/5 rounded-full"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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

      {/* USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
          <div className="bg-surface dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {editingUserId ? 'Edit Builder User' : 'New Builder User'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmitUser} className="p-6 space-y-4 bg-surface dark:bg-gray-800">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Full Name</label>
                <input type="text" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={userName} onChange={(e) => setUserName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Email Address</label>
                <input type="email" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Assign to Builder Group</label>
                <select 
                  required
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  value={userGroupId} 
                  onChange={(e) => setUserGroupId(e.target.value)}
                >
                  {builderGroups.map(bg => (
                    <option key={bg.id} value={bg.id}>{bg.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">
                   Password {editingUserId && <span className="text-xs font-normal opacity-75">(Leave blank to keep current)</span>}
                </label>
                <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-500" />
                   <input 
                     type="text" 
                     className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg pl-10 pr-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                     value={userPassword} 
                     onChange={(e) => setUserPassword(e.target.value)}
                     required={!editingUserId}
                   />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="text" onClick={() => setShowUserModal(false)}>Cancel</Button>
                <Button type="submit" variant="filled">{editingUserId ? 'Save Changes' : 'Create User'}</Button>
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
