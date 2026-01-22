import React, { useState, useEffect, useRef } from 'react';

interface HomeownerManualProps {
  homeownerId?: string;
}

const HomeownerManual: React.FC<HomeownerManualProps> = ({ homeownerId }) => {
  const [activeSection, setActiveSection] = useState(1);
  const [manualHtml, setManualHtml] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
              console.log('Contains .cover:', html.includes('class="cover"'));
              
              // Inject homeownerId into the HTML
              if (homeownerId) {
                html = html.replace(
                  "const homeownerId = urlParams.get('homeownerId') || 'default';",
                  `const homeownerId = '${homeownerId}';`
                );
              }
              
              // Extract only the body content (remove html/head tags)
              const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
              if (bodyMatch) {
                html = bodyMatch[1];
              }
              
              setManualHtml(html);
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

  // Define sections based on actual HTML structure
  const sections = [
    { id: 1, title: 'Cover & Quick Reference', selector: '.cover' },
    { id: 2, title: 'Understanding Your Warranty Team', selector: '.page:nth-of-type(2)' },
    { id: 3, title: 'Emergency: No Heat', selector: '.page:nth-of-type(3)' },
    { id: 4, title: 'Emergency: Plumbing Leaks', selector: '.page:nth-of-type(4)' },
    { id: 5, title: 'Glossary & Contacts', selector: '.page:nth-of-type(5)' },
    { id: 6, title: 'Contact & Notes', selector: '.page:nth-of-type(6)' },
  ];

  // Handle navigation - scroll to section
  const handleSectionClick = (sectionId: number) => {
    setActiveSection(sectionId);
    
    const section = sections.find(s => s.id === sectionId);
    if (!section || !contentRef.current) return;

    // Find the element in the content pane
    const element = contentRef.current.querySelector(section.selector) as HTMLElement;
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log(`✅ Scrolled to section: ${section.title}`);
    } else {
      console.log(`❌ Element not found for selector: ${section.selector}`);
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

        {/* Right Pane - Content */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
          {manualHtml ? (
            <div 
              ref={contentRef}
              className="p-8 prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-primary prose-h1:text-3xl prose-h2:text-2xl prose-a:text-blue-600 prose-img:rounded-lg prose-li:marker:text-primary dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: manualHtml }}
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
