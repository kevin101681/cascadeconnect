/**
 * Internal Users View - Full Implementation
 * 
 * Manages employees, contractors, and builder users in a flat page layout.
 * Extracted from InternalUserManagement modal component for Settings Tab.
 */

import React, { useState } from 'react';
import { InternalEmployee, Contractor, BuilderUser, BuilderGroup, Homeowner, UserRole } from '../../../types';
import Button from '../../Button';
import MaterialSelect from '../../MaterialSelect';
import { Plus, Edit2, Mail, Trash2, UserCheck, Shield, X, HardHat, Briefcase, Phone, User, Lock, Bell, Send } from 'lucide-react';
import { sendEmail } from '../../../services/emailService';

interface InternalUsersViewProps {
  employees: InternalEmployee[];
  onAddEmployee: (emp: InternalEmployee) => void;
  onUpdateEmployee: (emp: InternalEmployee) => void;
  onDeleteEmployee: (id: string) => void;
  
  contractors: Contractor[];
  onAddContractor: (sub: Contractor) => void;
  onUpdateContractor: (sub: Contractor) => void;
  onDeleteContractor: (id: string) => void;

  builderUsers: BuilderUser[];
  builderGroups: BuilderGroup[];
  homeowners: Homeowner[];
  onAddBuilderUser: (user: BuilderUser, password?: string) => void;
  onUpdateBuilderUser: (user: BuilderUser, password?: string) => void;
  onDeleteBuilderUser: (id: string) => void;

  currentUser?: InternalEmployee;
  initialTab?: 'EMPLOYEES' | 'SUBS' | 'BUILDER_USERS';
}

const InternalUsersView: React.FC<InternalUsersViewProps> = ({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  contractors,
  onAddContractor,
  onUpdateContractor,
  onDeleteContractor,
  builderUsers,
  builderGroups,
  homeowners,
  onAddBuilderUser,
  onUpdateBuilderUser,
  onDeleteBuilderUser,
  currentUser,
  initialTab = 'EMPLOYEES'
}) => {
  // Check if current user is Administrator (has full access)
  const isAdministrator = currentUser?.role === 'Administrator';
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'SUBS' | 'BUILDER_USERS'>(initialTab);
  
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);

  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState('');
  
  // Email Notification Preferences
  const [empEmailNotifyClaimSubmitted, setEmpEmailNotifyClaimSubmitted] = useState(true);
  const [empEmailNotifyHomeownerAcceptsAppointment, setEmpEmailNotifyHomeownerAcceptsAppointment] = useState(true);
  const [empEmailNotifySubAcceptsAppointment, setEmpEmailNotifySubAcceptsAppointment] = useState(true);
  const [empEmailNotifyHomeownerRescheduleRequest, setEmpEmailNotifyHomeownerRescheduleRequest] = useState(true);
  const [empEmailNotifyTaskAssigned, setEmpEmailNotifyTaskAssigned] = useState(true);
  const [empEmailNotifyHomeownerEnrollment, setEmpEmailNotifyHomeownerEnrollment] = useState(true);
  // Push Notification Preferences
  const [empPushNotifyClaimSubmitted, setEmpPushNotifyClaimSubmitted] = useState(false);
  const [empPushNotifyHomeownerAcceptsAppointment, setEmpPushNotifyHomeownerAcceptsAppointment] = useState(false);
  const [empPushNotifySubAcceptsAppointment, setEmpPushNotifySubAcceptsAppointment] = useState(false);
  const [empPushNotifyHomeownerRescheduleRequest, setEmpPushNotifyHomeownerRescheduleRequest] = useState(false);
  const [empPushNotifyTaskAssigned, setEmpPushNotifyTaskAssigned] = useState(false);
  const [empPushNotifyHomeownerMessage, setEmpPushNotifyHomeownerMessage] = useState(false);
  const [empPushNotifyHomeownerEnrollment, setEmpPushNotifyHomeownerEnrollment] = useState(false);

  // Sub Form State
  const [subCompany, setSubCompany] = useState('');
  const [subContact, setSubContact] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subSpecialty, setSubSpecialty] = useState('');

  // Invite Sub Modal State
  const [showInviteSubModal, setShowInviteSubModal] = useState(false);
  const [inviteSubName, setInviteSubName] = useState('');
  const [inviteSubEmail, setInviteSubEmail] = useState('');
  const [inviteSubBody, setInviteSubBody] = useState('');

  // Builder User Form State
  const [showBuilderUserModal, setShowBuilderUserModal] = useState(false);
  const [editingBuilderUserId, setEditingBuilderUserId] = useState<string | null>(null);
  const [builderUserName, setBuilderUserName] = useState('');
  const [builderUserEmail, setBuilderUserEmail] = useState('');
  const [builderUserPassword, setBuilderUserPassword] = useState('');
  const [builderUserGroupId, setBuilderUserGroupId] = useState('');

  // --- Employee Handlers ---
  const handleOpenCreateEmp = () => {
    setEditingEmpId(null);
    setEmpName('');
    setEmpEmail('');
    setEmpRole('Administrator');
    // Reset email preferences to defaults (all true)
    setEmpEmailNotifyClaimSubmitted(true);
    setEmpEmailNotifyHomeownerAcceptsAppointment(true);
    setEmpEmailNotifySubAcceptsAppointment(true);
    setEmpEmailNotifyHomeownerRescheduleRequest(true);
    setEmpEmailNotifyTaskAssigned(true);
    setEmpEmailNotifyHomeownerEnrollment(true);
    // Push notifications default to false
    setEmpPushNotifyClaimSubmitted(false);
    setEmpPushNotifyHomeownerAcceptsAppointment(false);
    setEmpPushNotifySubAcceptsAppointment(false);
    setEmpPushNotifyHomeownerRescheduleRequest(false);
    setEmpPushNotifyTaskAssigned(false);
    setEmpPushNotifyHomeownerMessage(false);
    setEmpPushNotifyHomeownerEnrollment(false);
    setShowEmpModal(true);
  };

  const handleOpenEditEmp = (emp: InternalEmployee) => {
    setEditingEmpId(emp.id);
    setEmpName(emp.name);
    setEmpEmail(emp.email);
    setEmpRole(emp.role);
    // Load email preferences (default to true if not set)
    setEmpEmailNotifyClaimSubmitted(emp.emailNotifyClaimSubmitted !== false);
    setEmpEmailNotifyHomeownerAcceptsAppointment(emp.emailNotifyHomeownerAcceptsAppointment !== false);
    setEmpEmailNotifySubAcceptsAppointment(emp.emailNotifySubAcceptsAppointment !== false);
    setEmpEmailNotifyHomeownerRescheduleRequest(emp.emailNotifyHomeownerRescheduleRequest !== false);
    setEmpEmailNotifyTaskAssigned(emp.emailNotifyTaskAssigned !== false);
    // Load push notification preferences (default to false)
    setEmpPushNotifyClaimSubmitted(emp.pushNotifyClaimSubmitted === true);
    setEmpPushNotifyHomeownerAcceptsAppointment(emp.pushNotifyHomeownerAcceptsAppointment === true);
    setEmpPushNotifySubAcceptsAppointment(emp.pushNotifySubAcceptsAppointment === true);
    setEmpPushNotifyHomeownerRescheduleRequest(emp.pushNotifyHomeownerRescheduleRequest === true);
    setEmpPushNotifyTaskAssigned(emp.pushNotifyTaskAssigned === true);
    setEmpPushNotifyHomeownerMessage(emp.pushNotifyHomeownerMessage === true);
    setEmpPushNotifyHomeownerEnrollment(emp.pushNotifyHomeownerEnrollment === true);
    setEmpEmailNotifyHomeownerEnrollment(emp.emailNotifyHomeownerEnrollment !== false);
    setShowEmpModal(true);
  };

  const handleSubmitEmp = (e: React.FormEvent) => {
    e.preventDefault();
    const employeeData: InternalEmployee = {
      id: editingEmpId || crypto.randomUUID(),
      name: empName,
      email: empEmail,
      role: empRole,
      emailNotifyClaimSubmitted: empEmailNotifyClaimSubmitted,
      emailNotifyHomeownerAcceptsAppointment: empEmailNotifyHomeownerAcceptsAppointment,
      emailNotifySubAcceptsAppointment: empEmailNotifySubAcceptsAppointment,
      emailNotifyHomeownerRescheduleRequest: empEmailNotifyHomeownerRescheduleRequest,
      emailNotifyTaskAssigned: empEmailNotifyTaskAssigned,
      emailNotifyHomeownerEnrollment: empEmailNotifyHomeownerEnrollment,
      pushNotifyClaimSubmitted: empPushNotifyClaimSubmitted,
      pushNotifyHomeownerAcceptsAppointment: empPushNotifyHomeownerAcceptsAppointment,
      pushNotifySubAcceptsAppointment: empPushNotifySubAcceptsAppointment,
      pushNotifyHomeownerRescheduleRequest: empPushNotifyHomeownerRescheduleRequest,
      pushNotifyTaskAssigned: empPushNotifyTaskAssigned,
      pushNotifyHomeownerMessage: empPushNotifyHomeownerMessage,
      pushNotifyHomeownerEnrollment: empPushNotifyHomeownerEnrollment,
    };
    
    if (editingEmpId) {
      onUpdateEmployee(employeeData);
    } else {
      onAddEmployee(employeeData);
    }
    setShowEmpModal(false);
  };

  // --- Sub Handlers ---
  const handleOpenCreateSub = () => {
    setEditingSubId(null);
    setSubCompany('');
    setSubContact('');
    setSubEmail('');
    setSubPhone('');
    setSubSpecialty('General');
    setShowSubModal(true);
  };

  const handleOpenEditSub = (sub: Contractor) => {
    setEditingSubId(sub.id);
    setSubCompany(sub.companyName);
    setSubContact(sub.contactName);
    setSubEmail(sub.email);
    setSubPhone(sub.phone || '');
    setSubSpecialty(sub.specialty);
    setShowSubModal(true);
  };

  const handleSubmitSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubId) {
      onUpdateContractor({ id: editingSubId, companyName: subCompany, contactName: subContact, email: subEmail, phone: subPhone || undefined, specialty: subSpecialty });
    } else {
      onAddContractor({ id: crypto.randomUUID(), companyName: subCompany, contactName: subContact, email: subEmail, phone: subPhone || undefined, specialty: subSpecialty });
    }
    setShowSubModal(false);
  };

  const handleOpenInviteSub = (sub: Contractor) => {
    setInviteSubName(sub.contactName || sub.companyName);
    setInviteSubEmail(sub.email);
    setInviteSubBody(`Cascade Builder Services has partnered with a builder you work with. We've created an online account for you that we use for scheduling and sending service orders. Please click the "Activate" button below and create a new username and password. Don't hesitate to contact us with any questions: info@cascadebuilderservices.com or 888-429-5468.`);
    setShowInviteSubModal(true);
  };

  const handleSendInviteSub = async () => {
    try {
      const subject = `Welcome to Cascade Builder Services - Activate Your Account`;
      await sendEmail({
        to: inviteSubEmail,
        subject: subject,
        body: inviteSubBody,
        fromName: 'Cascade Builder Services',
        fromRole: UserRole.ADMIN
      });
      alert(`Invite sent to ${inviteSubEmail} via Internal Mail System!`);
      setShowInviteSubModal(false);
      setInviteSubName('');
      setInviteSubEmail('');
      setInviteSubBody('');
    } catch (error) {
      console.error('Failed to send invite:', error);
      alert(`Failed to send invite email. Please try again.`);
    }
  };

  // --- Builder User Handlers ---
  const handleOpenCreateBuilderUser = () => {
    setEditingBuilderUserId(null);
    setBuilderUserName('');
    setBuilderUserEmail('');
    setBuilderUserPassword('');
    setBuilderUserGroupId(builderGroups.length > 0 ? builderGroups[0].id : '');
    setShowBuilderUserModal(true);
  };

  const handleOpenEditBuilderUser = (user: BuilderUser) => {
    setEditingBuilderUserId(user.id);
    setBuilderUserName(user.name);
    setBuilderUserEmail(user.email);
    setBuilderUserPassword(''); // Clear password (don't show existing)
    setBuilderUserGroupId(user.builderGroupId);
    setShowBuilderUserModal(true);
  };

  const handleSubmitBuilderUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBuilderUserId) {
      onUpdateBuilderUser({ 
        id: editingBuilderUserId, 
        name: builderUserName, 
        email: builderUserEmail, 
        builderGroupId: builderUserGroupId, 
        role: UserRole.BUILDER 
      }, builderUserPassword);
    } else {
      onAddBuilderUser({ 
        id: crypto.randomUUID(), 
        name: builderUserName, 
        email: builderUserEmail, 
        builderGroupId: builderUserGroupId, 
        role: UserRole.BUILDER 
      }, builderUserPassword);
    }
    setShowBuilderUserModal(false);
  };

  return (
    <div className="h-full flex flex-col bg-surface dark:bg-gray-800">
      {/* Header with Tabs */}
      <div className="border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700/50 flex-shrink-0">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100">
            Internal Users
          </h3>
          <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
            Manage employees, contractors, and builder users
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pb-4 flex gap-2">
          <button
            onClick={() => setActiveTab('EMPLOYEES')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'EMPLOYEES'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Internal Team
          </button>
          <button
            onClick={() => setActiveTab('SUBS')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'SUBS'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <HardHat className="h-4 w-4" />
            Subs
          </button>
          <button
            onClick={() => setActiveTab('BUILDER_USERS')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'BUILDER_USERS'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <User className="h-4 w-4" />
            Builder Users
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Action Bar */}
          <div className="mb-4 flex justify-end">
            {activeTab === 'EMPLOYEES' ? (
              isAdministrator && (
                <Button onClick={handleOpenCreateEmp} icon={<Plus className="h-4 w-4" />}>
                  Add Team Member
                </Button>
              )
            ) : activeTab === 'SUBS' ? (
              <Button onClick={handleOpenCreateSub} icon={<Plus className="h-4 w-4" />}>
                Add Sub
              </Button>
            ) : (
              isAdministrator && (
                <Button onClick={handleOpenCreateBuilderUser} icon={<Plus className="h-4 w-4" />} disabled={builderGroups.length === 0}>
                  Add Builder User
                </Button>
              )
            )}
          </div>

          {/* Table */}
          <div className="bg-surface dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden shadow-sm">
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
                    ) : activeTab === 'SUBS' ? (
                      <>
                        <th className="px-6 py-4 font-medium">Company</th>
                        <th className="px-6 py-4 font-medium">Contact</th>
                        <th className="px-6 py-4 font-medium">Specialty</th>
                        <th className="px-6 py-4 font-medium">Email</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 font-medium">User Name</th>
                        <th className="px-6 py-4 font-medium">Email</th>
                        <th className="px-6 py-4 font-medium">Assigned Group</th>
                        <th className="px-6 py-4 font-medium">Linked Homeowners</th>
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
                            <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-medium">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-surface-on dark:text-gray-100">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-surface-on-variant dark:text-gray-400">{emp.email}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isAdministrator && (
                              <button
                                onClick={() => handleOpenEditEmp(emp)}
                                className="p-2 text-surface-on-variant dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-surface-container dark:hover:bg-gray-600 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            {isAdministrator && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete ${emp.name}?`)) {
                                    onDeleteEmployee(emp.id);
                                  }
                                }}
                                className="p-2 text-surface-on-variant dark:text-gray-400 hover:text-error dark:hover:text-red-400 hover:bg-surface-container dark:hover:bg-gray-600 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : activeTab === 'SUBS' ? (
                    contractors.map(sub => (
                      <tr key={sub.id} className="hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-medium text-surface-on dark:text-gray-100">{sub.companyName}</span>
                        </td>
                        <td className="px-6 py-4 text-surface-on-variant dark:text-gray-400">{sub.contactName}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-300">
                            {sub.specialty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-surface-on-variant dark:text-gray-400">{sub.email}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenInviteSub(sub)}
                              className="p-2 text-surface-on-variant dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-surface-container dark:hover:bg-gray-600 rounded-lg transition-colors"
                              title="Send Invite"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditSub(sub)}
                              className="p-2 text-surface-on-variant dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-surface-container dark:hover:bg-gray-600 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${sub.companyName}?`)) {
                                  onDeleteContractor(sub.id);
                                }
                              }}
                              className="p-2 text-surface-on-variant dark:text-gray-400 hover:text-error dark:hover:text-red-400 hover:bg-surface-container dark:hover:bg-gray-600 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    builderUsers.map(user => {
                      const group = builderGroups.find(g => g.id === user.builderGroupId);
                      const linkedHomeowners = homeowners.filter(h => h.builderUserId === user.id);
                      return (
                        <tr key={user.id} className="hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-medium text-surface-on dark:text-gray-100">{user.name}</span>
                          </td>
                          <td className="px-6 py-4 text-surface-on-variant dark:text-gray-400">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-container dark:bg-gray-700 text-surface-on dark:text-gray-300">
                              {group?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-surface-on-variant dark:text-gray-400">{linkedHomeowners.length}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isAdministrator && (
                                <button
                                  onClick={() => handleOpenEditBuilderUser(user)}
                                  className="p-2 text-surface-on-variant dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-surface-container dark:hover:bg-gray-600 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                              {isAdministrator && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete ${user.name}? This will unlink ${linkedHomeowners.length} homeowner(s).`)) {
                                      onDeleteBuilderUser(user.id);
                                    }
                                  }}
                                  className="p-2 text-surface-on-variant dark:text-gray-400 hover:text-error dark:hover:text-red-400 hover:bg-surface-container dark:hover:bg-gray-600 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
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
        </div>
      </div>

      {/* Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEmpModal(false)}>
          <div className="bg-surface dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center">
              <h4 className="text-lg font-semibold text-surface-on dark:text-gray-100">
                {editingEmpId ? 'Edit Team Member' : 'Add Team Member'}
              </h4>
              <button onClick={() => setShowEmpModal(false)} className="p-2 rounded-full hover:bg-surface-container dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitEmp} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Name *</label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Email *</label>
                <input
                  type="email"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Role *</label>
                <MaterialSelect
                  value={empRole}
                  onChange={(val) => setEmpRole(val)}
                  options={[
                    { label: 'Administrator', value: 'Administrator' },
                    { label: 'User', value: 'User' }
                  ]}
                />
              </div>

              {/* Email Notifications Section */}
              <div className="pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                <h5 className="text-sm font-semibold text-surface-on dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </h5>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empEmailNotifyClaimSubmitted} onChange={(e) => setEmpEmailNotifyClaimSubmitted(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Claim Submitted</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empEmailNotifyHomeownerAcceptsAppointment} onChange={(e) => setEmpEmailNotifyHomeownerAcceptsAppointment(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner Accepts Appointment</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empEmailNotifySubAcceptsAppointment} onChange={(e) => setEmpEmailNotifySubAcceptsAppointment(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Sub Accepts Appointment</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empEmailNotifyHomeownerRescheduleRequest} onChange={(e) => setEmpEmailNotifyHomeownerRescheduleRequest(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner Reschedule Request</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empEmailNotifyTaskAssigned} onChange={(e) => setEmpEmailNotifyTaskAssigned(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Task Assigned</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empEmailNotifyHomeownerEnrollment} onChange={(e) => setEmpEmailNotifyHomeownerEnrollment(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner Enrollment</span>
                  </label>
                </div>
              </div>

              {/* Push Notifications Section */}
              <div className="pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                <h5 className="text-sm font-semibold text-surface-on dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Push Notifications
                </h5>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empPushNotifyClaimSubmitted} onChange={(e) => setEmpPushNotifyClaimSubmitted(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Claim Submitted</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empPushNotifyHomeownerAcceptsAppointment} onChange={(e) => setEmpPushNotifyHomeownerAcceptsAppointment(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner Accepts Appointment</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empPushNotifySubAcceptsAppointment} onChange={(e) => setEmpPushNotifySubAcceptsAppointment(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Sub Accepts Appointment</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empPushNotifyHomeownerRescheduleRequest} onChange={(e) => setEmpPushNotifyHomeownerRescheduleRequest(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner Reschedule Request</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empPushNotifyTaskAssigned} onChange={(e) => setEmpPushNotifyTaskAssigned(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Task Assigned</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empPushNotifyHomeownerMessage} onChange={(e) => setEmpPushNotifyHomeownerMessage(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner Message</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={empPushNotifyHomeownerEnrollment} onChange={(e) => setEmpPushNotifyHomeownerEnrollment(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner Enrollment</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                <Button type="button" onClick={() => setShowEmpModal(false)} variant="ghost">
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEmpId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contractor Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowSubModal(false)}>
          <div className="bg-surface dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center">
              <h4 className="text-lg font-semibold text-surface-on dark:text-gray-100">
                {editingSubId ? 'Edit Contractor' : 'Add Contractor'}
              </h4>
              <button onClick={() => setShowSubModal(false)} className="p-2 rounded-full hover:bg-surface-container dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitSub} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={subCompany}
                  onChange={(e) => setSubCompany(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Contact Name *</label>
                <input
                  type="text"
                  value={subContact}
                  onChange={(e) => setSubContact(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Email *</label>
                <input
                  type="email"
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Phone</label>
                <input
                  type="tel"
                  value={subPhone}
                  onChange={(e) => setSubPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Specialty *</label>
                <MaterialSelect
                  value={subSpecialty}
                  onChange={(val) => setSubSpecialty(val)}
                  options={[
                    { label: 'General', value: 'General' },
                    { label: 'HVAC', value: 'HVAC' },
                    { label: 'Plumbing', value: 'Plumbing' },
                    { label: 'Electrical', value: 'Electrical' },
                    { label: 'Carpentry', value: 'Carpentry' },
                    { label: 'Drywall', value: 'Drywall' },
                    { label: 'Painting', value: 'Painting' },
                    { label: 'Flooring', value: 'Flooring' },
                    { label: 'Roofing', value: 'Roofing' },
                    { label: 'Siding', value: 'Siding' },
                    { label: 'Concrete', value: 'Concrete' },
                    { label: 'Landscaping', value: 'Landscaping' },
                    { label: 'Other', value: 'Other' }
                  ]}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => setShowSubModal(false)} variant="ghost">
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSubId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Contractor Modal */}
      {showInviteSubModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowInviteSubModal(false)}>
          <div className="bg-surface dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center">
              <h4 className="text-lg font-semibold text-surface-on dark:text-gray-100 flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Send Invite
              </h4>
              <button onClick={() => setShowInviteSubModal(false)} className="p-2 rounded-full hover:bg-surface-container dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">To</label>
                <input
                  type="text"
                  value={`${inviteSubName} (${inviteSubEmail})`}
                  disabled
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface-container dark:bg-gray-700/50 text-surface-on dark:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Message</label>
                <textarea
                  value={inviteSubBody}
                  onChange={(e) => setInviteSubBody(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-100"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => setShowInviteSubModal(false)} variant="ghost">
                  Cancel
                </Button>
                <Button onClick={handleSendInviteSub} icon={<Send className="h-4 w-4" />}>
                  Send Invite
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Builder User Modal */}
      {showBuilderUserModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowBuilderUserModal(false)}>
          <div className="bg-surface dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center">
              <h4 className="text-lg font-semibold text-surface-on dark:text-gray-100">
                {editingBuilderUserId ? 'Edit Builder User' : 'Add Builder User'}
              </h4>
              <button onClick={() => setShowBuilderUserModal(false)} className="p-2 rounded-full hover:bg-surface-container dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitBuilderUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Name *</label>
                <input
                  type="text"
                  value={builderUserName}
                  onChange={(e) => setBuilderUserName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Email *</label>
                <input
                  type="email"
                  value={builderUserEmail}
                  onChange={(e) => setBuilderUserEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">
                  Password {editingBuilderUserId ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={builderUserPassword}
                  onChange={(e) => setBuilderUserPassword(e.target.value)}
                  required={!editingBuilderUserId}
                  className="w-full px-4 py-2 border border-surface-outline-variant dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-100 mb-2">Builder Group *</label>
                <MaterialSelect
                  value={builderUserGroupId}
                  onChange={(val) => setBuilderUserGroupId(val)}
                  options={builderGroups.map(g => ({ label: g.name, value: g.id }))}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" onClick={() => setShowBuilderUserModal(false)} variant="ghost">
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBuilderUserId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalUsersView;
