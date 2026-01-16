import React, { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';

// 1. RESTORE IMPORTS - Using lazy load to match original architecture
const InternalUsersView = React.lazy(() => import('../views/InternalUsersView'));
const TemplatesView = React.lazy(() => import('../views/TemplatesView'));
const HomeownersDirectoryView = React.lazy(() => import('../views/HomeownersDirectoryView'));

export default function SettingsTab(props: any) {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Internal Users');

  useEffect(() => {
    setMounted(true);
    console.log("🔮 SettingsTab: Portal Ready - Loading Real Components");
    console.log("📦 Props received:", Object.keys(props));
  }, []);

  if (!mounted) return null;

  const content = (
    <div 
      style={{
        position: 'fixed',
        top: '80px',
        left: '20px',
        right: '20px',
        bottom: '20px',
        zIndex: 99999,
        backgroundColor: '#f8fafc', // Light gray background
        border: '5px solid #2563eb', // Blue border (Changing to Blue for "Data Mode")
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div className="bg-white p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold text-blue-700">
          🛠️ SETTINGS DIAGNOSTIC MODE
        </h2>
        <div className="space-x-2">
          {['Internal Users', 'Templates', 'Homeowners'].map(cat => (
            <button
              key={cat}
              onClick={() => {
                console.log(`🔄 Switching to: ${cat}`);
                setActiveCategory(cat);
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area - THE REAL TEST */}
      <div className="flex-1 overflow-auto p-6 bg-white">
        <Suspense fallback={
          <div className="p-10 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-blue-500 font-medium">Loading {activeCategory} Component...</p>
          </div>
        }>
          
          {/* PASS PROPS THROUGH (Spread the props we received) */}
          {activeCategory === 'Internal Users' && (() => {
            console.log("✅ Rendering InternalUsersView");
            return <InternalUsersView {...props} />;
          })()}
          
          {activeCategory === 'Templates' && (() => {
            console.log("✅ Rendering TemplatesView");
            return <TemplatesView {...props} />;
          })()}
          
          {activeCategory === 'Homeowners' && (() => {
            console.log("✅ Rendering HomeownersDirectoryView");
            return <HomeownersDirectoryView {...props} />;
          })()}
          
          {!['Internal Users', 'Templates', 'Homeowners'].includes(activeCategory) && (
            <div className="p-10 text-center text-gray-400">View not connected in debug mode</div>
          )}

        </Suspense>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
