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

  // NUCLEAR FIX - FIXED POSITION TO BREAK OUT OF BROKEN PARENT LAYOUT
  return (
    <div className="fixed inset-0 z-[9999] bg-red-100 flex flex-col pt-24 pl-64 pointer-events-auto">
      {/* ^ FIXED POSITION BREAKS IT OUT OF ANY BROKEN PARENT LAYOUT */}

      <div className="bg-white border-4 border-blue-600 p-10 shadow-2xl w-3/4 h-3/4 overflow-auto rounded-xl">
        <h1 className="text-4xl text-red-600 font-black mb-4">
          🚨 DEBUG MODE: SETTINGS TAB 🚨
        </h1>
        <div className="text-xl font-bold mb-4 text-black">
          Active Category: {activeCategory || "NULL"}
        </div>

        {/* CATEGORY BUTTONS - HARD CODED FOR TEST */}
        <div className="flex gap-4 mb-8 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                console.log("🔄 Category changed to:", cat.id);
                setActiveCategory(cat.id);
              }}
              className={`px-4 py-2 border-2 rounded font-medium ${
                activeCategory === cat.id
                  ? "bg-blue-600 text-white border-blue-800"
                  : "bg-gray-200 text-black border-gray-400 hover:bg-gray-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* CONTENT RENDER */}
        <div className="border-t-2 border-black pt-4">
          <div className="text-lg font-semibold mb-2 text-green-600">
            ✅ Rendering: {activeCategory}
          </div>
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
