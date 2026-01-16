import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// KEEP IMPORTS DISABLED FOR NOW TO ENSURE STABILITY
// import InternalUsersView from ... 

export default function SettingsTab(props: any) {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Internal Users');

  useEffect(() => {
    setMounted(true);
    console.log("🔮 SettingsTab: Portal Ready");
    return () => console.log("👋 SettingsTab: Unmounting");
  }, []);

  // Hydration safety
  if (!mounted) return null;

  // THE CONTENT
  const content = (
    <div 
      style={{
        position: 'fixed',
        top: '100px', // Below your main navbar
        left: '20px',
        right: '20px',
        bottom: '20px',
        backgroundColor: '#fff1f2', // Rose-50
        border: '8px solid #e11d48', // Red-600
        zIndex: 2147483647, // Max 32-bit Integer (Highest possible Z-index)
        boxShadow: '0 0 0 100vmax rgba(0,0,0,0.5)', // Dim background
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        padding: '24px',
        overflow: 'hidden'
      }}
    >
      <div className="flex justify-between items-center mb-6 border-b pb-4 border-red-200">
        <h1 className="text-3xl font-black text-red-600">
          🔮 PORTAL MODE ACTIVE
        </h1>
        <button 
           onClick={() => console.log("✅ Clicked test")}
           className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Test Interaction
        </button>
      </div>

      <p className="mb-4 text-lg">
        This content is rendered via <code>createPortal(document.body)</code>. 
        It cannot be clipped by the Dashboard.
      </p>

      <div className="flex gap-2 mb-6">
        {['Internal Users', 'Templates', 'Homeowners'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded border ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-white'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white border-2 border-dashed border-gray-300 p-8 flex items-center justify-center text-gray-500">
        placeholder for: {activeCategory}
      </div>
    </div>
  );

  // TELEPORT TO BODY
  return createPortal(content, document.body);
}
