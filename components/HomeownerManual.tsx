import React, { useState, useEffect, useRef } from 'react';

interface HomeownerManualProps {
  homeownerId?: string;
}

const HomeownerManual: React.FC<HomeownerManualProps> = ({ homeownerId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Define pages based on actual HTML structure
  // Structure: .cover, then .page elements in order
  const pages = [
    { id: 1, title: 'Cover & Quick Reference', selector: '.cover' },
    { id: 2, title: 'Understanding Your Warranty Team', selector: 'body > .page:nth-of-type(3)' },
    { id: 3, title: 'Emergency: No Heat', selector: 'body > .page:nth-of-type(4)' },
    { id: 4, title: 'Emergency: Plumbing Leaks', selector: 'body > .page:nth-of-type(5)' },
    { id: 5, title: 'Glossary & Contacts', selector: 'body > .page:nth-of-type(6)' },
    { id: 6, title: 'Contact & Notes', selector: 'body > .page:nth-of-type(7)' },
  ];

  // Scroll to the correct section when page changes
  useEffect(() => {
    const scrollToSection = () => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow?.document) {
        console.log('Iframe not ready');
        return;
      }

      const iframeDoc = iframe.contentWindow.document;
      
      // Check if the document body has content
      if (!iframeDoc.body || iframeDoc.body.children.length === 0) {
        console.log('Iframe body not ready, retrying...');
        setTimeout(scrollToSection, 100);
        return;
      }

      const page = pages[currentPage - 1];
      if (!page) return;

      const element = iframeDoc.querySelector(page.selector) as HTMLElement;
      
      if (element) {
        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log(`✓ Scrolled to section ${currentPage}: ${page.title}`);
      } else {
        console.log(`Waiting for content... (selector: ${page.selector})`);
        // Retry after a longer delay if content isn't ready
        setTimeout(scrollToSection, 200);
      }
    };

    const iframe = iframeRef.current;
    if (!iframe) return;

    // If iframe is already loaded, scroll with a longer delay
    if (iframe.contentDocument?.readyState === 'complete') {
      setTimeout(scrollToSection, 300);
    } else {
      // Otherwise wait for load event
      const handleLoad = () => {
        console.log('Iframe loaded');
        setTimeout(scrollToSection, 300);
      };
      iframe.addEventListener('load', handleLoad);
      return () => iframe.removeEventListener('load', handleLoad);
    }
  }, [currentPage]);

  return (
    <div className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-1 overflow-hidden flex flex-col h-[90vh]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex-shrink-0">
        <div>
          <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">
            Homeowner Manual
          </h2>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setCurrentPage(page.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentPage === page.id
                  ? 'text-white'
                  : 'bg-surface dark:bg-gray-700 text-surface-on dark:text-gray-900 hover:bg-surface-container dark:hover:bg-gray-600'
              }`}
              style={currentPage === page.id ? { backgroundColor: '#3C6B80' } : {}}
            >
              {page.title}
            </button>
          ))}
        </div>
      </div>
      
      {/* Manual Content - Full Height */}
      <div className="flex-1 overflow-hidden">
        <iframe 
          ref={iframeRef}
          src={`/complete_homeowner_manual.html${homeownerId ? `?homeownerId=${homeownerId}` : ''}`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Homeowner Manual"
          sandbox="allow-same-origin allow-scripts allow-forms"
          loading="eager"
        />
      </div>
    </div>
  );
};

export default HomeownerManual;
