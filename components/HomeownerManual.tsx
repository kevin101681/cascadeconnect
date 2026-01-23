import React, { useState, useEffect, useRef } from 'react';

interface HomeownerManualProps {
  homeownerId?: string;
}

const HomeownerManual: React.FC<HomeownerManualProps> = ({ homeownerId }) => {
  const [activeSection, setActiveSection] = useState<string>('cover');
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

  // Define sections with search text for H1 headers
  const SECTIONS = [
    { id: 'cover', label: 'Welcome', searchText: 'Homeowner' }, // Matches "Homeowner's Manual"
    { id: 'quick', label: 'Quick Reference', searchText: 'Quick Reference' },
    { id: 'team', label: 'Warranty Team', searchText: 'Understanding Your Warranty Team' },
    { id: 'heat', label: 'Emergency: No Heat', searchText: 'EMERGENCY: No Heat' },
    { id: 'plumbing', label: 'Emergency: Leaks', searchText: 'EMERGENCY: Plumbing Leaks' },
    { id: 'glossary', label: 'Glossary', searchText: 'Homeowner\'s Glossary' },
    { id: 'contacts', label: 'Important Contacts', searchText: 'Important Contacts' },
    { id: 'notes', label: 'My Notes', searchText: 'My Home Notes' },
  ];

  // Handle navigation - search for H1 by text content and scroll using scrollTo
  const handleSectionClick = (section: typeof SECTIONS[0]) => {
    setActiveSection(section.id);
    
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;

    try {
      const win = iframeRef.current.contentWindow;
      const doc = win.document;

      // Calculate target scroll position
      let targetTop = 0;
      
      if (section.id !== 'cover') {
        // Search for H1 containing the text
        const headers = Array.from(doc.getElementsByTagName('h1'));
        const target = headers.find(h => h.textContent?.includes(section.searchText));
        
        if (target) {
          // Calculate offset relative to the iframe document
          targetTop = target.getBoundingClientRect().top + win.scrollY - 20; // -20 for padding
          console.log(`✅ Found section: ${section.label}, scrolling to ${targetTop}`);
        } else {
          console.log(`❌ Header not found with text: "${section.searchText}"`);
        }
      }

      // Scroll ONLY the iframe window (prevents parent window jump)
      win.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      });
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
        <div className="flex flex-col gap-2 p-4 bg-white w-64 border-r border-surface-outline-variant dark:border-gray-700 dark:bg-gray-800 shrink-0 overflow-y-auto">
          <nav className="flex flex-col gap-2">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section)}
                className={`w-full text-left px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ease-in-out flex items-center gap-2 border ${
                  activeSection === section.id
                    ? 'bg-white text-primary border-primary shadow-md -translate-y-0.5 dark:border-primary dark:bg-gray-800 dark:text-primary dark:shadow-gray-700/50'
                    : 'text-muted-foreground border-transparent hover:bg-gray-50 hover:text-foreground hover:shadow-sm hover:-translate-y-0.5 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {section.label}
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
