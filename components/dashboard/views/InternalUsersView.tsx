/**
 * Internal Users View - Embedded Adapter
 * 
 * Wraps InternalUserManagement component for flat page use (not modal).
 * Removes modal styling and adapts layout for split-pane design.
 */

import React, { useState } from 'react';
import { InternalEmployee, Contractor, BuilderUser, BuilderGroup, Homeowner } from '../../../types';
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

const InternalUsersView: React.FC<InternalUsersViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'SUBS' | 'BUILDER_USERS'>(
    props.initialTab || 'EMPLOYEES'
  );

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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'EMPLOYEES'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <User className="inline h-4 w-4 mr-2" />
            Employees
          </button>
          <button
            onClick={() => setActiveTab('SUBS')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'SUBS'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <HardHat className="inline h-4 w-4 mr-2" />
            Contractors
          </button>
          <button
            onClick={() => setActiveTab('BUILDER_USERS')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'BUILDER_USERS'
                ? 'bg-primary text-primary-on'
                : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-600'
            }`}
          >
            <Briefcase className="inline h-4 w-4 mr-2" />
            Builder Users
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'EMPLOYEES' && (
          <div className="text-surface-on dark:text-gray-100">
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
              Employee management interface will be rendered here.
            </p>
            <p className="text-xs text-surface-on-variant dark:text-gray-500">
              Note: Full implementation requires extracting tab-specific content from InternalUserManagement component.
            </p>
          </div>
        )}

        {activeTab === 'SUBS' && (
          <div className="text-surface-on dark:text-gray-100">
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
              Contractor management interface will be rendered here.
            </p>
          </div>
        )}

        {activeTab === 'BUILDER_USERS' && (
          <div className="text-surface-on dark:text-gray-100">
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
              Builder user management interface will be rendered here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InternalUsersView;
