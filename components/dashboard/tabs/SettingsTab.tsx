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

  // INLINE STYLES - FORCE VISIBILITY (HIGHEST SPECIFICITY)
  return (
    <div 
      style={{
        position: 'fixed', 
        top: '100px', /* Push down below header */
        left: '0', 
        right: '0', 
        bottom: '0', 
        zIndex: 9999, 
        backgroundColor: '#ffffff', /* Force White Background */
        display: 'flex',
        flexDirection: 'row',
        border: '5px solid red' /* Debug Border */
      }}
    >
      {/* SIDEBAR */}
      <div style={{
        width: '300px',
        backgroundColor: '#fef3c7', /* Yellow */
        borderRight: '2px solid black',
        padding: '20px',
        overflowY: 'auto',
        flexShrink: 0
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>
          Settings
        </h2>
        
        {/* CATEGORY BUTTONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                console.log("🔄 Category changed to:", cat.id);
                setActiveCategory(cat.id);
              }}
              style={{
                padding: '10px 15px',
                backgroundColor: activeCategory === cat.id ? '#2563eb' : '#e5e7eb',
                color: activeCategory === cat.id ? '#ffffff' : '#000000',
                border: '2px solid #000',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: activeCategory === cat.id ? 'bold' : 'normal',
                textAlign: 'left'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div style={{
        flex: 1,
        backgroundColor: '#d1fae5', /* Green */
        padding: '30px',
        overflowY: 'auto'
      }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'black', color: '#dc2626', marginBottom: '20px' }}>
          🚨 DEBUG MODE: SETTINGS TAB 🚨
        </h1>
        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#000' }}>
          Active Category: {activeCategory || "NULL"}
        </div>

        {/* CONTENT RENDER */}
        <div style={{ borderTop: '2px solid black', paddingTop: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px', color: '#16a34a' }}>
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
