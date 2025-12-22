
import React, { useState } from 'react';
import { InternalEmployee, Contractor, BuilderUser, BuilderGroup, UserRole } from '../types';
import Button from './Button';
import MaterialSelect from './MaterialSelect';
import { Plus, Edit2, Mail, Trash2, UserCheck, Shield, X, HardHat, Briefcase, Phone, User, Lock, Bell, Send } from 'lucide-react';
import { sendEmail } from '../services/emailService';

interface InternalUserManagementProps {
  employees: InternalEmployee[];
  onAddEmployee: (emp: InternalEmployee) => void;
  onUpdateEmployee: (emp: InternalEmployee) => void;
  onDeleteEmployee: (id: string) => void;
  
  contractors: Contractor[];
  onAddContractor: (sub: Contractor) => void;
  onUpdateContractor: (sub: Contractor) => void;
  onDeleteContractor: (id: string) => void;

  builderUsers?: BuilderUser[];
  builderGroups?: BuilderGroup[];
  onAddBuilderUser?: (user: BuilderUser, password?: string) => void;
  onUpdateBuilderUser?: (user: BuilderUser, password?: string) => void;
  onDeleteBuilderUser?: (id: string) => void;

  onClose: () => void;
  initialTab?: 'EMPLOYEES' | 'SUBS' | 'BUILDER_USERS';
  currentUser?: InternalEmployee;
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
  builderUsers = [],
  builderGroups = [],
  onAddBuilderUser,
  onUpdateBuilderUser,
  onDeleteBuilderUser,
  onClose,
  initialTab = 'EMPLOYEES',
  currentUser
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
    if (!onAddBuilderUser) return;
    setEditingBuilderUserId(null);
    setBuilderUserName('');
    setBuilderUserEmail('');
    setBuilderUserPassword('');
    setBuilderUserGroupId(builderGroups.length > 0 ? builderGroups[0].id : '');
    setShowBuilderUserModal(true);
  };

  const handleOpenEditBuilderUser = (user: BuilderUser) => {
    if (!onUpdateBuilderUser) return;
    setEditingBuilderUserId(user.id);
    setBuilderUserName(user.name);
    setBuilderUserEmail(user.email);
    setBuilderUserPassword(''); // Clear password (don't show existing)
    setBuilderUserGroupId(user.builderGroupId);
    setShowBuilderUserModal(true);
  };

  const handleSubmitBuilderUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddBuilderUser || !onUpdateBuilderUser) return;
    
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]">
      <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8 max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Internal Users
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
      {/* Tabs */}
      <div className="flex border-b border-surface-outline-variant dark:border-gray-700">
        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'EMPLOYEES' 
              ? 'border-b-2 border-primary text-primary' 
              : 'text-surface-on dark:text-gray-100 hover:bg-surface-container/50 dark:hover:bg-gray-700/50'
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
              : 'text-surface-on dark:text-gray-100 hover:bg-surface-container/50'
          }`}
        >
          <HardHat className="h-4 w-4" />
          Subs
        </button>
        {onAddBuilderUser && onUpdateBuilderUser && onDeleteBuilderUser && (
          <button
            onClick={() => setActiveTab('BUILDER_USERS')}
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'BUILDER_USERS' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-surface-on dark:text-gray-100 hover:bg-surface-container/50'
            }`}
          >
            <User className="h-4 w-4" />
            Builder Users
          </button>
        )}
      </div>

      <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden shadow-sm">
        
        {/* ACTION BAR */}
        <div className="p-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex justify-end">
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
                      {isAdministrator && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenEditEmp(emp)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => onDeleteEmployee(emp.id)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-error hover:bg-error/5 rounded-full"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : activeTab === 'SUBS' ? (
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
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenInviteSub(sub)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full" title="Invite Sub"><Mail className="h-4 w-4" /></button>
                        <button onClick={() => handleOpenEditSub(sub)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full"><Edit2 className="h-4 w-4" /></button>
                        {isAdministrator && (
                          <button onClick={() => onDeleteContractor(sub.id)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-error hover:bg-error/5 rounded-full"><Trash2 className="h-4 w-4" /></button>
                        )}
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
                        {isAdministrator && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleOpenEditBuilderUser(user)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => onDeleteBuilderUser && onDeleteBuilderUser(user.id)} className="p-1.5 text-surface-outline-variant dark:text-gray-500 hover:text-error hover:bg-error/5 rounded-full"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EMPLOYEE MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out] overflow-y-auto">
          <div className="bg-surface dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex-shrink-0">
              <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                {editingEmpId ? 'Edit Team Member' : 'New Team Member'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmitEmp} className="p-6 space-y-4 bg-surface dark:bg-gray-800 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Full Name</label>
                <input type="text" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={empName} onChange={(e) => setEmpName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Email Address</label>
                <input type="email" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} />
              </div>
              <div>
                <MaterialSelect
                  label="Role"
                  value={empRole}
                  onChange={(value) => setEmpRole(value)}
                  options={[
                    { value: 'Administrator', label: 'Administrator' },
                    { value: 'Employee', label: 'Employee' }
                  ]}
                />
              </div>
              
              {/* Email Notification Preferences */}
              <div className="pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-4 w-4 text-primary" />
                  <label className="text-sm font-medium text-surface-on dark:text-gray-100">Email Notifications</label>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner submits a claim</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empEmailNotifyClaimSubmitted}
                        onChange={(e) => setEmpEmailNotifyClaimSubmitted(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empEmailNotifyClaimSubmitted ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empEmailNotifyClaimSubmitted ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner accepts an appointment date</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empEmailNotifyHomeownerAcceptsAppointment}
                        onChange={(e) => setEmpEmailNotifyHomeownerAcceptsAppointment(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empEmailNotifyHomeownerAcceptsAppointment ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empEmailNotifyHomeownerAcceptsAppointment ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">Sub accepts an appointment date</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empEmailNotifySubAcceptsAppointment}
                        onChange={(e) => setEmpEmailNotifySubAcceptsAppointment(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empEmailNotifySubAcceptsAppointment ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empEmailNotifySubAcceptsAppointment ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner requests a reschedule</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empEmailNotifyHomeownerRescheduleRequest}
                        onChange={(e) => setEmpEmailNotifyHomeownerRescheduleRequest(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empEmailNotifyHomeownerRescheduleRequest ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empEmailNotifyHomeownerRescheduleRequest ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">New task assigned to user</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empEmailNotifyTaskAssigned}
                        onChange={(e) => setEmpEmailNotifyTaskAssigned(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empEmailNotifyTaskAssigned ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empEmailNotifyTaskAssigned ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">New homeowner enrollment</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empEmailNotifyHomeownerEnrollment}
                        onChange={(e) => setEmpEmailNotifyHomeownerEnrollment(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empEmailNotifyHomeownerEnrollment ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empEmailNotifyHomeownerEnrollment ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-2 pt-2 border-t border-surface-outline-variant/50 dark:border-gray-700/50">
                    Note: Users always receive email notifications when a homeowner sends a message if they are on the thread.
                  </p>
                </div>
              </div>

              {/* Push Notification Preferences */}
              <div className="pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-4 w-4 text-primary" />
                  <label className="text-sm font-medium text-surface-on dark:text-gray-100">Push Notifications</label>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner submits a claim</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empPushNotifyClaimSubmitted}
                        onChange={(e) => setEmpPushNotifyClaimSubmitted(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empPushNotifyClaimSubmitted ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empPushNotifyClaimSubmitted ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner accepts an appointment date</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empPushNotifyHomeownerAcceptsAppointment}
                        onChange={(e) => setEmpPushNotifyHomeownerAcceptsAppointment(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empPushNotifyHomeownerAcceptsAppointment ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empPushNotifyHomeownerAcceptsAppointment ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">Sub accepts an appointment date</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empPushNotifySubAcceptsAppointment}
                        onChange={(e) => setEmpPushNotifySubAcceptsAppointment(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empPushNotifySubAcceptsAppointment ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empPushNotifySubAcceptsAppointment ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner requests a reschedule</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empPushNotifyHomeownerRescheduleRequest}
                        onChange={(e) => setEmpPushNotifyHomeownerRescheduleRequest(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empPushNotifyHomeownerRescheduleRequest ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empPushNotifyHomeownerRescheduleRequest ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">New task assigned to user</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empPushNotifyTaskAssigned}
                        onChange={(e) => setEmpPushNotifyTaskAssigned(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empPushNotifyTaskAssigned ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empPushNotifyTaskAssigned ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">Homeowner sends a message</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empPushNotifyHomeownerMessage}
                        onChange={(e) => setEmpPushNotifyHomeownerMessage(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empPushNotifyHomeownerMessage ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empPushNotifyHomeownerMessage ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-surface-on dark:text-gray-100">New homeowner enrollment</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={empPushNotifyHomeownerEnrollment}
                        onChange={(e) => setEmpPushNotifyHomeownerEnrollment(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-[52px] h-8 rounded-full transition-colors duration-200 ease-out ${empPushNotifyHomeownerEnrollment ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-high border border-surface-outline dark:border-gray-600'}`}>
                        <div className={`w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-sm transform transition-transform duration-200 ease-out mt-1 ${empPushNotifyHomeownerEnrollment ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                  </label>
                </div>
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
                <MaterialSelect
                  label="Specialty"
                  value={subSpecialty}
                  onChange={(value) => setSubSpecialty(value)}
                  options={[
                    { value: 'General', label: 'General' },
                    { value: 'Plumbing', label: 'Plumbing' },
                    { value: 'HVAC', label: 'HVAC' },
                    { value: 'Electrical', label: 'Electrical' },
                    { value: 'Flooring', label: 'Flooring' },
                    { value: 'Drywall', label: 'Drywall' },
                    { value: 'Painting', label: 'Painting' },
                    { value: 'Roofing', label: 'Roofing' },
                    { value: 'Cabinetry', label: 'Cabinetry' },
                    { value: 'Windows', label: 'Windows' },
                    { value: 'Exterior', label: 'Exterior' },
                    { value: 'Concrete', label: 'Concrete' },
                    { value: 'Appliances', label: 'Appliances' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Email Address</label>
                <input type="email" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Phone Number</label>
                <input type="tel" className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={subPhone} onChange={(e) => setSubPhone(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="filled" onClick={() => setShowSubModal(false)}>Cancel</Button>
                <Button type="submit" variant="filled">{editingSubId ? 'Save Changes' : 'Create Sub'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BUILDER USER MODAL */}
      {showBuilderUserModal && onAddBuilderUser && onUpdateBuilderUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
          <div className="bg-surface dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out]">
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {editingBuilderUserId ? 'Edit Builder User' : 'New Builder User'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmitBuilderUser} className="p-6 space-y-4 bg-surface dark:bg-gray-800">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Full Name</label>
                <input type="text" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={builderUserName} onChange={(e) => setBuilderUserName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">Email Address</label>
                <input type="email" required className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={builderUserEmail} onChange={(e) => setBuilderUserEmail(e.target.value)} />
              </div>
              <div>
                <MaterialSelect
                  label="Assign to Builder Group"
                  value={builderUserGroupId}
                  onChange={(value) => setBuilderUserGroupId(value)}
                  options={builderGroups.map(bg => ({ value: bg.id, label: bg.name }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">
                   Password {editingBuilderUserId && <span className="text-xs font-normal opacity-75">(Leave blank to keep current)</span>}
                </label>
                <div className="relative">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-500" />
                   <input 
                     type="text" 
                     className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg pl-10 pr-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                     value={builderUserPassword} 
                     onChange={(e) => setBuilderUserPassword(e.target.value)}
                     required={!editingBuilderUserId}
                   />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="text" onClick={() => setShowBuilderUserModal(false)}>Cancel</Button>
                <Button type="submit" variant="filled">{editingBuilderUserId ? 'Save Changes' : 'Create User'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE SUB MODAL */}
      {showInviteSubModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]">
          <div className="bg-surface dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700 flex-shrink-0">
              <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Invite Sub
              </h2>
              <button onClick={() => setShowInviteSubModal(false)} className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-surface dark:bg-gray-800 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-300 mb-1">Contact Name</label>
                <input 
                  type="text" 
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={inviteSubName}
                  onChange={(e) => setInviteSubName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-300 mb-1">Email Address</label>
                <input 
                  type="email" 
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={inviteSubEmail}
                  onChange={(e) => setInviteSubEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-on-variant dark:text-gray-300 mb-1">Invitation Message</label>
                <textarea
                  rows={8}
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none text-sm leading-relaxed"
                  value={inviteSubBody}
                  onChange={(e) => setInviteSubBody(e.target.value)}
                />
              </div>
              <div className="pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                <a
                  href="https://cascadebuilderservices.com/register?account_id=new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full bg-primary hover:bg-primary/90 text-primary-on dark:text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-sm"
                >
                  Activate
                </a>
              </div>
            </div>

            <div className="p-4 flex justify-end gap-3 flex-shrink-0">
              <Button variant="filled" onClick={() => setShowInviteSubModal(false)}>Cancel</Button>
              <Button variant="filled" onClick={handleSendInviteSub} disabled={!inviteSubEmail || !inviteSubBody} icon={<Send className="h-4 w-4" />}>
                Send Invitation
              </Button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default InternalUserManagement;
