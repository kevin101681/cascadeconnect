/**
 * Settings Tab Component - SIMPLIFIED ROBUST VERSION
 * 
 * A dedicated settings page with vertical sidebar navigation.
 * Completely rewritten for visibility and reliability.
 */

import React, { useState, Suspense } from 'react';
import { Users, Home, Database, BarChart, Server, FileText, ChevronRight } from 'lucide-react';
import { InternalEmployee, Contractor, BuilderUser, BuilderGroup, Homeowner } from '../../../types';

// Lazy load view adapters (non-modal versions)
const InternalUsersView = React.lazy(() => import('../views/InternalUsersView').then(m => ({ default: m.default })));
const HomeownersDirectoryView = React.lazy(() => import('../views/HomeownersDirectoryView').then(m => ({ default: m.default })));
const DataImportView = React.lazy(() => import('../views/DataImportView').then(m => ({ default: m.default })));
const BackendStatusView = React.lazy(() => import('../views/BackendStatusView').then(m => ({ default: m.default })));
const TemplatesView = React.lazy(() => import('../views/TemplatesView').then(m => ({ default: m.default })));

// Define category types
type CategoryType = 
  | 'internal-users'
  | 'homeowners'
  | 'data-import'
  | 'analytics'
  | 'backend'
  | 'templates';

interface Category {
  id: CategoryType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface SettingsTabProps {
  // Internal Users props
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
  onAddBuilderUser: (user: BuilderUser, password?: string) => void;
  onUpdateBuilderUser: (user: BuilderUser, password?: string) => void;
  onDeleteBuilderUser: (id: string) => void;

  // Homeowners props
  homeowners: Homeowner[];
  onUpdateHomeowner: (homeowner: Homeowner) => void;
  onDeleteHomeowner: (id: string) => void;

  // Data import props (if needed)
  onDataReset?: () => void;

  // Current user (for permissions)
  currentUser?: InternalEmployee;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
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
  onAddBuilderUser,
  onUpdateBuilderUser,
  onDeleteBuilderUser,
  homeowners,
  onUpdateHomeowner,
  onDeleteHomeowner,
  onDataReset,
  currentUser,
}) => {
  // Force initial category to be "internal-users"
  const [activeCategory, setActiveCategory] = useState<CategoryType>('internal-users');

  console.log("🎨 SettingsTab rendering with category:", activeCategory);

  // Categories definition
  const categories: Category[] = [
    {
      id: 'internal-users',
      label: 'Internal Users',
      icon: <Users className="h-5 w-5" />,
      description: 'Manage employees, contractors, and builder users',
    },
    {
      id: 'homeowners',
      label: 'Homeowners',
      icon: <Home className="h-5 w-5" />,
      description: 'View and manage homeowner directory',
    },
    {
      id: 'data-import',
      label: 'Data Import',
      icon: <Database className="h-5 w-5" />,
      description: 'Import builder data and manage test data',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart className="h-5 w-5" />,
      description: 'View system analytics and reports',
    },
    {
      id: 'backend',
      label: 'Backend',
      icon: <Server className="h-5 w-5" />,
      description: 'Monitor backend services and deployments',
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: <FileText className="h-5 w-5" />,
      description: 'Manage response templates',
    },
  ];

  // Handler for category selection
  const handleCategorySelect = (categoryId: CategoryType) => {
    console.log("🔄 Switching category to:", categoryId);
    setActiveCategory(categoryId);
  };

  // Render content based on active category
  const renderContent = () => {
    // Failsafe: force to internal-users if somehow null
    const category = activeCategory || 'internal-users';
    
    console.log("📄 Rendering content for:", category);

    switch (category) {
      case 'internal-users':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <InternalUsersView
              employees={employees}
              onAddEmployee={onAddEmployee}
              onUpdateEmployee={onUpdateEmployee}
              onDeleteEmployee={onDeleteEmployee}
              contractors={contractors}
              onAddContractor={onAddContractor}
              onUpdateContractor={onUpdateContractor}
              onDeleteContractor={onDeleteContractor}
              builderUsers={builderUsers}
              builderGroups={builderGroups}
              homeowners={homeowners}
              onAddBuilderUser={onAddBuilderUser}
              onUpdateBuilderUser={onUpdateBuilderUser}
              onDeleteBuilderUser={onDeleteBuilderUser}
              currentUser={currentUser}
            />
          </Suspense>
        );

      case 'homeowners':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <HomeownersDirectoryView
              homeowners={homeowners}
              builderGroups={builderGroups}
              builderUsers={builderUsers}
              onUpdateHomeowner={onUpdateHomeowner}
              onDeleteHomeowner={onDeleteHomeowner}
            />
          </Suspense>
        );

      case 'data-import':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <DataImportView onDataReset={onDataReset} />
          </Suspense>
        );

      case 'analytics':
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <BarChart className="h-16 w-16 mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Analytics Dashboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analytics and reporting features coming soon.
            </p>
          </div>
        );

      case 'backend':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <BackendStatusView />
          </Suspense>
        );

      case 'templates':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <TemplatesView />
          </Suspense>
        );

      default:
        return (
          <div className="p-10 text-red-500 font-bold">
            Error: Unknown category "{category}"
          </div>
        );
    }
  };

  // SIMPLIFIED UNIFIED LAYOUT
  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-[80vh] bg-white dark:bg-gray-900 text-black dark:text-white">
      
      {/* LEFT SIDEBAR - Category Navigation */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 bg-gray-50 dark:bg-gray-800">
        <h2 className="font-bold text-xl mb-6 text-gray-900 dark:text-gray-100">Settings</h2>
        
        <nav className="space-y-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                ${activeCategory === category.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <div className="flex-shrink-0">
                {category.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {category.label}
                </div>
              </div>
              {activeCategory === category.id && (
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-800">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          {categories.find(c => c.id === activeCategory)?.label || 'Settings'}
        </h3>
        
        {/* Render the selected category content */}
        <div className="bg-white dark:bg-gray-900 rounded-lg">
          {renderContent()}
        </div>
      </div>
      
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
  </div>
);

export default SettingsTab;
