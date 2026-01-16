import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, X, Copy, Link as LinkIcon, CheckCircle, Users, UserPlus } from 'lucide-react';
import Button from './Button';
import { BuilderGroup } from '../types';
import { db, isDbConfigured } from '../db';
import { users as usersTable, builderGroups as builderGroupsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

interface BuilderUser {
  id: string;
  name: string;
  email: string;
  builderGroupId: string | null;
  role: string;
}

interface BuilderManagementProps {
  builderGroups: BuilderGroup[];
  onAddBuilderGroup: (group: BuilderGroup) => void;
  onUpdateBuilderGroup: (group: BuilderGroup) => void;
  onDeleteBuilderGroup: (id: string) => void;
  onClose: () => void;
}

const BuilderManagement: React.FC<BuilderManagementProps> = ({
  builderGroups,
  onAddBuilderGroup,
  onUpdateBuilderGroup,
  onDeleteBuilderGroup,
  onClose,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<BuilderGroup | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  // Member management state
  const [allBuilderUsers, setAllBuilderUsers] = useState<BuilderUser[]>([]);
  const [groupMembers, setGroupMembers] = useState<BuilderUser[]>([]);
  const [orphanUsers, setOrphanUsers] = useState<BuilderUser[]>([]);
  const [selectedOrphanId, setSelectedOrphanId] = useState<string>('');
  const [showAddMember, setShowAddMember] = useState(false);

  // Quick create state
  const [quickCreateUserId, setQuickCreateUserId] = useState<string>('');
  const [quickCreateGroupName, setQuickCreateGroupName] = useState<string>('');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentSlug, setEnrollmentSlug] = useState('');

  // Load all builder users on mount
  useEffect(() => {
    loadBuilderUsers();
  }, []);

  // Update group members when selection changes
  useEffect(() => {
    if (selectedGroup) {
      const members = allBuilderUsers.filter(u => u.builderGroupId === selectedGroup.id);
      setGroupMembers(members);
    } else {
      setGroupMembers([]);
    }
  }, [selectedGroup, allBuilderUsers]);

  // Update orphan users whenever allBuilderUsers changes
  useEffect(() => {
    const orphans = allBuilderUsers.filter(u => !u.builderGroupId);
    setOrphanUsers(orphans);
  }, [allBuilderUsers]);

  const loadBuilderUsers = async () => {
    if (!isDbConfigured) return;

    try {
      const users = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.role, 'BUILDER'));

      const mappedUsers: BuilderUser[] = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        builderGroupId: u.builderGroupId || null,
        role: u.role || 'BUILDER',
      }));

      setAllBuilderUsers(mappedUsers);
    } catch (error) {
      console.error('Failed to load builder users:', error);
    }
  };

  const handleSelectGroup = (group: BuilderGroup) => {
    setSelectedGroup(group);
    setIsEditing(false);
    setIsCreating(false);
    setShowAddMember(false);
    setSelectedOrphanId('');
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedGroup(null);
    setName('');
    setEmail('');
    setEnrollmentSlug('');
  };

  const handleEdit = () => {
    if (!selectedGroup) return;
    setIsEditing(true);
    setName(selectedGroup.name);
    setEmail(selectedGroup.email || '');
    setEnrollmentSlug(selectedGroup.enrollmentSlug || '');
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Builder group name is required');
      return;
    }

    const groupData: BuilderGroup = {
      id: selectedGroup?.id || crypto.randomUUID(),
      name: name.trim(),
      email: email.trim() || undefined,
      enrollmentSlug: enrollmentSlug.trim() || undefined,
    };

    if (isCreating) {
      onAddBuilderGroup(groupData);
      setSelectedGroup(groupData);
      setIsCreating(false);
    } else if (isEditing && selectedGroup) {
      onUpdateBuilderGroup({ ...selectedGroup, ...groupData });
      setSelectedGroup({ ...selectedGroup, ...groupData });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    if (selectedGroup) {
      setName(selectedGroup.name);
      setEmail(selectedGroup.email || '');
      setEnrollmentSlug(selectedGroup.enrollmentSlug || '');
    }
  };

  const handleDelete = () => {
    if (!selectedGroup) return;
    
    // Check if group has members
    if (groupMembers.length > 0) {
      alert(`Cannot delete ${selectedGroup.name}. Please remove all members first.`);
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedGroup.name}?`)) {
      onDeleteBuilderGroup(selectedGroup.id);
      setSelectedGroup(null);
    }
  };

  const generateSlug = () => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Check for duplicates
    let finalSlug = slug;
    let counter = 1;
    while (builderGroups.some(g => g.enrollmentSlug === finalSlug && g.id !== selectedGroup?.id)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }
    
    setEnrollmentSlug(finalSlug);
  };

  const copyEnrollmentLink = () => {
    if (!selectedGroup?.enrollmentSlug) return;
    const link = `${window.location.origin}/enroll/${selectedGroup.enrollmentSlug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBulkGenerateLinks = async () => {
    const groupsWithoutSlugs = builderGroups.filter(g => !g.enrollmentSlug);
    
    if (groupsWithoutSlugs.length === 0) {
      alert('All builder groups already have enrollment links!');
      return;
    }

    if (!confirm(`Generate enrollment links for ${groupsWithoutSlugs.length} builder groups?`)) {
      return;
    }

    setIsGeneratingBulk(true);

    try {
      for (const group of groupsWithoutSlugs) {
        const slug = group.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        let finalSlug = slug;
        let counter = 1;
        while (builderGroups.some(g => g.enrollmentSlug === finalSlug && g.id !== group.id)) {
          finalSlug = `${slug}-${counter}`;
          counter++;
        }
        
        const updatedGroup = { ...group, enrollmentSlug: finalSlug };
        await onUpdateBuilderGroup(updatedGroup);
      }

      alert(`Successfully generated ${groupsWithoutSlugs.length} enrollment links!`);
    } catch (error) {
      console.error('Bulk generation error:', error);
      alert('Failed to generate some links. Please try again.');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const handleAddMemberToGroup = async () => {
    if (!selectedGroup || !selectedOrphanId) {
      alert('Please select a user to add');
      return;
    }

    if (!isDbConfigured) {
      alert('Database not configured');
      return;
    }

    try {
      // Update user's builderGroupId in database
      await db
        .update(usersTable)
        .set({ builderGroupId: selectedGroup.id })
        .where(eq(usersTable.id, selectedOrphanId));

      // Reload users
      await loadBuilderUsers();
      
      setShowAddMember(false);
      setSelectedOrphanId('');
      alert('Member added successfully!');
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member. Please try again.');
    }
  };

  const handleRemoveMemberFromGroup = async (userId: string) => {
    if (!confirm('Remove this member from the group?')) return;

    if (!isDbConfigured) {
      alert('Database not configured');
      return;
    }

    try {
      // Set user's builderGroupId to null
      await db
        .update(usersTable)
        .set({ builderGroupId: null })
        .where(eq(usersTable.id, userId));

      // Reload users
      await loadBuilderUsers();
      alert('Member removed successfully!');
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member. Please try again.');
    }
  };

  const handleQuickCreate = async () => {
    if (!quickCreateUserId || !quickCreateGroupName.trim()) {
      alert('Please select a user and enter a group name');
      return;
    }

    if (!isDbConfigured) {
      alert('Database not configured');
      return;
    }

    try {
      // Create the new group
      const newGroupId = crypto.randomUUID();
      const newGroup: BuilderGroup = {
        id: newGroupId,
        name: quickCreateGroupName.trim(),
      };

      // Add group to database
      await db.insert(builderGroupsTable).values({
        id: newGroup.id,
        name: newGroup.name,
        email: null,
        enrollmentSlug: null,
      } as any);

      // Update user's builderGroupId
      await db
        .update(usersTable)
        .set({ builderGroupId: newGroupId })
        .where(eq(usersTable.id, quickCreateUserId));

      // Update local state
      onAddBuilderGroup(newGroup);
      
      // Reload users
      await loadBuilderUsers();

      // Reset and close
      setQuickCreateUserId('');
      setQuickCreateGroupName('');
      setIsQuickCreateOpen(false);
      
      // Select the new group
      setSelectedGroup(newGroup);
      
      alert(`Group "${newGroup.name}" created successfully!`);
    } catch (error) {
      console.error('Quick create failed:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  return (
    <div className="w-full h-full bg-surface dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-outline-variant dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary dark:text-primary-light" />
          <h2 className="text-xl font-semibold text-surface-on dark:text-white">Builder Groups</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-surface-container dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-surface-on-variant dark:text-gray-400" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: Group List */}
        <aside className="w-1/3 border-r border-surface-outline-variant dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-surface-outline-variant dark:border-gray-700 space-y-2">
            <Button onClick={handleCreateNew} icon={<Plus className="h-4 w-4" />} className="w-full">
              Create New Group
            </Button>
            {orphanUsers.length > 0 && (
              <Button 
                onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
                icon={<UserPlus className="h-4 w-4" />} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Quick Group Create ({orphanUsers.length} orphans)
              </Button>
            )}
            {builderGroups.some(g => !g.enrollmentSlug) && (
              <Button 
                onClick={handleBulkGenerateLinks} 
                icon={<LinkIcon className="h-4 w-4" />} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isGeneratingBulk}
              >
                {isGeneratingBulk ? 'Generating...' : 'Generate Missing Links'}
              </Button>
            )}
          </div>

          {/* Quick Create Panel */}
          {isQuickCreateOpen && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-sm mb-3 text-surface-on dark:text-white">Quick Group Create</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-surface-on-variant dark:text-gray-400 mb-1">
                    Select Orphan User
                  </label>
                  <select
                    value={quickCreateUserId}
                    onChange={(e) => setQuickCreateUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-surface-outline dark:border-gray-600 rounded-lg text-sm"
                  >
                    <option value="">-- Select User --</option>
                    {orphanUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-surface-on-variant dark:text-gray-400 mb-1">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={quickCreateGroupName}
                    onChange={(e) => setQuickCreateGroupName(e.target.value)}
                    placeholder="e.g., Brikat Homes"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-surface-outline dark:border-gray-600 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleQuickCreate}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
                  >
                    Create & Link
                  </Button>
                  <Button
                    onClick={() => {
                      setIsQuickCreateOpen(false);
                      setQuickCreateUserId('');
                      setQuickCreateGroupName('');
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm py-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Group List */}
          <div className="flex-1 overflow-y-auto">
            {builderGroups.length === 0 ? (
              <div className="p-8 text-center text-surface-on-variant dark:text-gray-400">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No builder groups yet</p>
                <p className="text-xs mt-1">Create one to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-outline-variant dark:divide-gray-700">
                {builderGroups.map(group => {
                  const memberCount = allBuilderUsers.filter(u => u.builderGroupId === group.id).length;
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleSelectGroup(group)}
                      className={`w-full text-left p-4 hover:bg-surface-container dark:hover:bg-gray-800 transition-colors ${
                        selectedGroup?.id === group.id
                          ? 'bg-primary/10 dark:bg-primary-dark/20 border-l-4 border-primary dark:border-primary-light'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-surface-on dark:text-white">{group.name}</div>
                          {group.email && (
                            <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                              {group.email}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 text-xs text-surface-on-variant dark:text-gray-400">
                              <Users className="h-3 w-3" />
                              {memberCount} {memberCount === 1 ? 'member' : 'members'}
                            </div>
                            {group.enrollmentSlug && (
                              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <LinkIcon className="h-3 w-3" />
                                Link active
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Right Pane: Detail View */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {isCreating ? (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-surface-on dark:text-white">Create New Builder Group</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Brikat Homes"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-surface-outline dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@brikathomes.com"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-surface-outline dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                    Enrollment Slug
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={enrollmentSlug}
                      onChange={(e) => setEnrollmentSlug(e.target.value)}
                      placeholder="brikat-homes"
                      className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-surface-outline dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button onClick={generateSlug} icon={<LinkIcon className="h-4 w-4" />} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSave} className="bg-primary hover:bg-primary-dark text-white">
                  Create Group
                </Button>
                <Button onClick={handleCancel} className="bg-gray-500 hover:bg-gray-600 text-white">
                  Cancel
                </Button>
              </div>
            </div>
          ) : selectedGroup ? (
            <div className="space-y-6">
              {/* Group Info Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-surface-outline-variant dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-surface-on dark:text-white">Group Information</h3>
                  {!isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleEdit}
                        className="p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <Edit2 className="h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                      </button>
                      <button
                        onClick={handleDelete}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                        Group Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-surface-outline dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-surface-outline dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                        Enrollment Slug
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={enrollmentSlug}
                          onChange={(e) => setEnrollmentSlug(e.target.value)}
                          className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-surface-outline dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <Button onClick={generateSlug} icon={<LinkIcon className="h-4 w-4" />} className="bg-blue-600 hover:bg-blue-700 text-white">
                          Generate
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button onClick={handleSave} className="bg-primary hover:bg-primary-dark text-white">
                        Save Changes
                      </Button>
                      <Button onClick={handleCancel} className="bg-gray-500 hover:bg-gray-600 text-white">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-surface-on-variant dark:text-gray-400">Name</div>
                      <div className="text-base font-medium text-surface-on dark:text-white">{selectedGroup.name}</div>
                    </div>
                    {selectedGroup.email && (
                      <div>
                        <div className="text-sm text-surface-on-variant dark:text-gray-400">Email</div>
                        <div className="text-base text-surface-on dark:text-white">{selectedGroup.email}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Enrollment Link Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-surface-outline-variant dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-surface-on dark:text-white mb-4">Enrollment Link</h3>
                
                {selectedGroup.enrollmentSlug ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-surface-container dark:bg-gray-700 rounded-lg break-all text-sm text-surface-on dark:text-gray-300">
                      {window.location.origin}/enroll/{selectedGroup.enrollmentSlug}
                    </div>
                    <Button
                      onClick={copyEnrollmentLink}
                      icon={copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      className={copied ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                    >
                      {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-surface-on-variant dark:text-gray-400">
                      No enrollment link generated yet.
                    </p>
                    <Button
                      onClick={() => {
                        setIsEditing(true);
                        setName(selectedGroup.name);
                        setEmail(selectedGroup.email || '');
                        setEnrollmentSlug('');
                        generateSlug();
                      }}
                      icon={<LinkIcon className="h-4 w-4" />}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Generate Link
                    </Button>
                  </div>
                )}
              </div>

              {/* Members Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-surface-outline-variant dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-surface-on dark:text-white">
                    Members ({groupMembers.length})
                  </h3>
                  {orphanUsers.length > 0 && (
                    <Button
                      onClick={() => setShowAddMember(!showAddMember)}
                      icon={<UserPlus className="h-4 w-4" />}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3"
                    >
                      Add Member
                    </Button>
                  )}
                </div>

                {/* Add Member Form */}
                {showAddMember && orphanUsers.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                      Select User to Add
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedOrphanId}
                        onChange={(e) => setSelectedOrphanId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-surface-outline dark:border-gray-600 rounded-lg text-sm"
                      >
                        <option value="">-- Select User --</option>
                        {orphanUsers.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={handleAddMemberToGroup}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                        disabled={!selectedOrphanId}
                      >
                        Add
                      </Button>
                      <Button
                        onClick={() => {
                          setShowAddMember(false);
                          setSelectedOrphanId('');
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Members List */}
                {groupMembers.length === 0 ? (
                  <div className="text-center py-8 text-surface-on-variant dark:text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No members in this group yet</p>
                    {orphanUsers.length > 0 && (
                      <p className="text-xs mt-1">Add builder users from the list of orphans</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-surface-container dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-surface-on dark:text-white">{member.name}</div>
                          <div className="text-sm text-surface-on-variant dark:text-gray-400">{member.email}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveMemberFromGroup(member.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                          title="Remove from group"
                        >
                          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-surface-on-variant dark:text-gray-400">
              <div className="text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">Select a builder group to view details</p>
                <p className="text-sm mt-2">or create a new one to get started</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default BuilderManagement;
