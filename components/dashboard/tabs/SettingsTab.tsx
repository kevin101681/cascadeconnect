/**
 * Settings Tab Component - UNIFIED RESPONSIVE LAYOUT
 * 
 * Single layout that works on both mobile and desktop.
 * No conditional rendering or hidden/visible conflicts.
 */

import React, { useState, Suspense } from 'react';
import { Users, Home, Database, BarChart, Server, FileText } from 'lucide-react';
import { InternalEmployee, Contractor, BuilderUser, BuilderGroup, Homeowner } from '../../../types';

// Lazy load view adapters (non-modal versions)
const InternalUsersView = React.lazy(() => import('../views/InternalUsersView').then(m => ({ default: m.default })));
const HomeownersDirectoryView = React.lazy(() => import('../views/HomeownersDirectoryView').then(m => ({ default: m.default })));
const DataImportView = React.lazy(() => import('../views/DataImportView').then(m => ({ default: m.default })));
const BackendStatusView = React.lazy(() => import('../views/BackendStatusView').then(m => ({ default: m.default })));
const TemplatesView = React.lazy(() => import('../views/TemplatesView').then(m => ({ default: m.default })));

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

  // Data import props
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
  // Force initial category
  const [activeCategory, setActiveCategory] = useState<string>('Internal Users');

  console.log("🎨 SettingsTab UNIFIED LAYOUT rendering - category:", activeCategory);

  // Category definitions
  const categories = [
    { id: 'Internal Users', label: 'Internal Users', icon: <Users className="h-4 w-4 mr-2" /> },
    { id: 'Homeowners', label: 'Homeowners', icon: <Home className="h-4 w-4 mr-2" /> },
    { id: 'Data Import', label: 'Data Import', icon: <Database className="h-4 w-4 mr-2" /> },
    { id: 'Analytics', label: 'Analytics', icon: <BarChart className="h-4 w-4 mr-2" /> },
    { id: 'Backend', label: 'Backend', icon: <Server className="h-4 w-4 mr-2" /> },
    { id: 'Templates', label: 'Templates', icon: <FileText className="h-4 w-4 mr-2" /> },
  ];

  // Render content based on active category
  const renderContent = () => {
    console.log("📄 Rendering content for:", activeCategory);

    switch (activeCategory) {
      case 'Internal Users':
        return (
          <>
            <div className="bg-orange-200 border-2 border-orange-600 p-4 mb-4 rounded">
              <h3 className="text-xl font-bold text-orange-900">
                📍 Internal Users View Loading...
              </h3>
            </div>
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
          </>
        );

      case 'Homeowners':
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

      case 'Data Import':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <DataImportView onDataReset={onDataReset} />
          </Suspense>
        );

      case 'Analytics':
        return (
          <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded text-gray-500 dark:text-gray-400 text-center">
            <BarChart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-sm">Analytics and reporting features coming soon.</p>
          </div>
        );

      case 'Backend':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <BackendStatusView />
          </Suspense>
        );

      case 'Templates':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <TemplatesView />
          </Suspense>
        );

      default:
        return (
          <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded text-gray-500 dark:text-gray-400">
            Placeholder for {activeCategory}
          </div>
        );
    }
  };

  // UNIFIED RESPONSIVE LAYOUT - HIGH VISIBILITY DEBUG MODE
  return (
    <div className="relative z-50 flex flex-col md:flex-row w-full h-full min-h-[600px] bg-blue-100 text-black border-4 border-red-600 shadow-2xl">
      
      {/* Left Sidebar - YELLOW DEBUG */}
      <div className="w-full md:w-64 bg-yellow-100 border-b md:border-b-0 md:border-r border-black flex-shrink-0">
        <div className="p-4 font-semibold text-lg border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
          Settings
        </div>
        <div className="flex md:flex-col overflow-x-auto md:overflow-visible p-2 gap-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                console.log("🔄 Category changed to:", cat.id);
                setActiveCategory(cat.id);
              }}
              className={`flex items-center text-left px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                activeCategory === cat.id
                  ? "bg-blue-600 text-white font-medium"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Content Pane - GREEN DEBUG */}
      <div className="flex-1 p-6 overflow-y-auto bg-green-100">
        <div className="max-w-4xl mx-auto">
          {/* VISUAL PROOF OF RENDER */}
          <h1 className="text-4xl font-black text-purple-600 mb-4 animate-pulse">
            🎯 SETTINGS TAB IS HERE 🎯
          </h1>
          
          <h2 className="text-2xl font-bold mb-6 text-black">
            {activeCategory}
          </h2>
          
          {/* Content Switch */}
          {renderContent()}
        </div>
      </div>
      
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600"></div>
  </div>
);

export default SettingsTab;
