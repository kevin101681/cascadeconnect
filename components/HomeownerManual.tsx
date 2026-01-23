import React, { useState, useRef } from 'react';

interface HomeownerManualProps {
  homeownerId?: string;
}

const HomeownerManual: React.FC<HomeownerManualProps> = ({ homeownerId }) => {
  const [activeSection, setActiveSection] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Define sections with anchor IDs for navigation
  const sections = [
    { id: 1, title: 'Cover & Quick Reference', anchor: 'cover' },
    { id: 2, title: 'Understanding Your Warranty Team', anchor: 'warranty-team' },
    { id: 3, title: 'Emergency: No Heat', anchor: 'emergency-heat' },
    { id: 4, title: 'Emergency: Plumbing Leaks', anchor: 'emergency-plumbing' },
    { id: 5, title: 'Glossary & Contacts', anchor: 'glossary' },
    { id: 6, title: 'Contact & Notes', anchor: 'contact-notes' },
  ];

  // Handle navigation - update iframe hash
  const handleSectionClick = (sectionId: number) => {
    setActiveSection(sectionId);
    
    const section = sections.find(s => s.id === sectionId);
    if (!section || !iframeRef.current) return;

    try {
      // Navigate the iframe to the specific section using hash
      const iframe = iframeRef.current;
      if (iframe.contentWindow) {
        // Try to navigate using hash
        iframe.contentWindow.location.hash = section.anchor;
        console.log(`✅ Navigated iframe to section: ${section.title} (#${section.anchor})`);
      }
    } catch (error) {
      console.error('❌ Error navigating iframe:', error);
    }
  };

  // Build iframe src with homeownerId if provided
  const iframeSrc = homeownerId 
    ? `/static/manual.html?homeownerId=${encodeURIComponent(homeownerId)}`
    : '/static/manual.html';

  return (
    <div className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-1 overflow-hidden flex flex-col h-[calc(100vh-theme(spacing.32))]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex-shrink-0">
        <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">
          Homeowner Manual
        </h2>
      </div>
      
      {/* Two-Pane Layout */}
      <div className="flex h-full overflow-hidden">
        {/* Left Pane - Navigation Sidebar */}
        <div className="w-64 shrink-0 border-r border-surface-outline-variant dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4 overflow-y-auto">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'text-primary bg-blue-50 dark:bg-blue-900/30 border-l-4 border-primary'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
                }`}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Pane - Iframe Content */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-none"
            title="Homeowner Manual"
          />
        </div>
      </div>
    </div>
  );
};

export default HomeownerManual;
