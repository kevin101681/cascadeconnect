/**
 * Settings Tab Component
 * 
 * A dedicated settings page with vertical sidebar navigation.
 * Migrated from the header dropdown menu.
 * Uses split-pane layout matching the Builders tab design.
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
  // ==================== STATE ====================
  
  const [activeCategory, setActiveCategory] = useState<CategoryType>('internal-users');

  // ==================== CATEGORIES ====================
  
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

  // ==================== HANDLERS ====================
  
  const handleCategorySelect = (categoryId: CategoryType) => {
    setActiveCategory(categoryId);
  };

  // ==================== RENDER RIGHT PANE CONTENT ====================
  
  const renderRightPaneContent = () => {
    switch (activeCategory) {
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
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <BarChart className="h-16 w-16 mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-2">
              Analytics Dashboard
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">
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
        return null;
    }
  };

  // ==================== RENDER ====================
  
  console.log('🔧 SettingsTab rendering, activeCategory:', activeCategory);
  console.log('🔧 Props received:', { employees: employees.length, homeowners: homeowners.length });
  
  return (
    <div className="bg-surface dark:bg-gray-800 md:rounded-modal md:border border-surface-outline-variant dark:border-gray-700 flex flex-col md:flex-row overflow-hidden h-full min-h-0 md:max-h-[calc(100vh-8rem)]" style={{ minHeight: '500px', border: '2px solid red' }}>
      
      {/* ==================== LEFT SIDEBAR (Navigation) ==================== */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-surface-outline-variant dark:border-gray-700 flex flex-col min-h-0 bg-surface dark:bg-gray-800">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-surface-outline-variant dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-surface-on dark:text-gray-100">
            Settings
          </h2>
          <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
            Manage system settings and data
          </p>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-2">
          <nav className="space-y-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200
                  ${
                    activeCategory === category.id
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20'
                      : 'text-surface-on dark:text-gray-300 hover:bg-surface-container dark:hover:bg-gray-700/50 border border-transparent'
                  }
                `}
              >
                <div className="flex-shrink-0">
                  {category.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {category.label}
                  </div>
                  <div className="text-xs text-surface-on-variant dark:text-gray-400 truncate mt-0.5">
                    {category.description}
                  </div>
                </div>
                {activeCategory === category.id && (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ==================== RIGHT PANE (Content) ==================== */}
      <div className="flex-1 flex flex-col bg-surface dark:bg-gray-800 min-h-0 overflow-hidden">
        {renderRightPaneContent()}
      </div>
    </div>
  );
};

// ==================== LOADING SPINNER ====================

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

export default SettingsTab;
