import React, { useState, useEffect, useRef } from 'react';

interface HomeownerManualProps {
  homeownerId?: string;
}

const HomeownerManual: React.FC<HomeownerManualProps> = ({ homeownerId }) => {
  const [activeSection, setActiveSection] = useState(1);
  const [manualContent, setManualContent] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch the manual HTML content
  useEffect(() => {
    const fetchManual = async () => {
      try {
        // Try multiple paths
        const paths = ['/static/manual.html', '/complete_homeowner_manual.html'];
        
        for (const path of paths) {
          try {
            const response = await fetch(path, {
              headers: { 'Accept': 'text/html' },
              cache: 'no-cache'
            });
            
            if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
              let html = await response.text();
              console.log(`✅ Successfully fetched manual from ${path}`);
              console.log('HTML length:', html.length);
              
              // Inject homeownerId into the HTML if provided
              if (homeownerId) {
                html = html.replace(
                  "const homeownerId = urlParams.get('homeownerId') || 'default';",
                  `const homeownerId = '${homeownerId}';`
                );
              }
              
              setManualContent(html);
              return;
            }
          } catch (err) {
            console.log(`Failed to fetch from ${path}:`, err);
          }
        }
        
        console.error('❌ Could not fetch manual from any path');
      } catch (error) {
        console.error('Error fetching manual:', error);
      }
    };

    fetchManual();
  }, [homeownerId]);

  // Define sections with anchor IDs for navigation
  const sections = [
    { id: 1, title: 'Cover & Quick Reference', anchor: 'cover' },
    { id: 2, title: 'Understanding Your Warranty Team', anchor: 'warranty-team' },
    { id: 3, title: 'Emergency: No Heat', anchor: 'emergency-heat' },
    { id: 4, title: 'Emergency: Plumbing Leaks', anchor: 'emergency-plumbing' },
    { id: 5, title: 'Glossary & Contacts', anchor: 'glossary' },
    { id: 6, title: 'Contact & Notes', anchor: 'contact-notes' },
  ];

  // Handle navigation - scroll to element within iframe
  const handleSectionClick = (sectionId: number) => {
    setActiveSection(sectionId);
    
    const section = sections.find(s => s.id === sectionId);
    if (!section || !iframeRef.current) return;

    try {
      const iframe = iframeRef.current;
      if (iframe.contentWindow && iframe.contentWindow.document) {
        // Find element by ID in the iframe document
        const element = iframe.contentWindow.document.getElementById(section.anchor);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          console.log(`✅ Scrolled to section: ${section.title} (#${section.anchor})`);
        } else {
          console.log(`❌ Element not found with ID: ${section.anchor}`);
        }
      }
    } catch (error) {
      console.error('❌ Error navigating iframe:', error);
    }
  };

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
          {manualContent ? (
            <iframe
              ref={iframeRef}
              srcDoc={manualContent}
              className="w-full h-full border-none bg-white"
              title="Homeowner Manual"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-surface-on-variant dark:text-gray-400">Loading manual...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeownerManual;
