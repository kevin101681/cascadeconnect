import React, { useState, useEffect, useRef } from 'react';

interface HomeownerManualProps {
  homeownerId?: string;
}

const HomeownerManual: React.FC<HomeownerManualProps> = ({ homeownerId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [manualHtml, setManualHtml] = useState<string | null>(null);
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
              console.log('Contains .cover:', html.includes('class="cover"'));
              
              // Inject homeownerId into the HTML
              if (homeownerId) {
                html = html.replace(
                  "const homeownerId = urlParams.get('homeownerId') || 'default';",
                  `const homeownerId = '${homeownerId}';`
                );
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
  }, []);

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
      if (!iframe) {
        console.log('❌ No iframe ref');
        return;
      }

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (!iframeDoc) {
          console.log('❌ Cannot access iframe document - possible CORS issue');
          return;
        }

        console.log('📄 Iframe document accessible');
        console.log('📄 Ready state:', iframeDoc.readyState);
        console.log('📄 Body exists:', !!iframeDoc.body);
        console.log('📄 Body children count:', iframeDoc.body?.children.length || 0);
        
        if (iframeDoc.body && iframeDoc.body.children.length > 0) {
          console.log('📄 First child:', iframeDoc.body.children[0]?.tagName);
          console.log('📄 Looking for selector:', pages[currentPage - 1]?.selector);
          
          const page = pages[currentPage - 1];
          if (!page) return;

          const element = iframeDoc.querySelector(page.selector) as HTMLElement;
          
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log(`✅ Scrolled to section ${currentPage}: ${page.title}`);
          } else {
            // Try to find what elements ARE in the document
            const allElements = iframeDoc.querySelectorAll('body > *');
            console.log(`❌ Element not found. Found ${allElements.length} top-level elements:`, 
              Array.from(allElements).map((el: Element) => el.tagName + (el.className ? `.${el.className}` : '')).join(', '));
          }
        } else {
          console.log('⏳ Body not ready, waiting...');
          setTimeout(scrollToSection, 100);
        }
      } catch (error) {
        console.error('❌ Error accessing iframe:', error);
      }
    };

    const iframe = iframeRef.current;
    if (!iframe) return;

    // Wait for iframe to fully load
    const handleLoad = () => {
      console.log('🔄 Iframe load event fired');
      console.log('🔗 Iframe src:', iframe.src);
      console.log('🔗 Iframe contentWindow.location:', iframe.contentWindow?.location.href);
      setTimeout(scrollToSection, 500);
    };
    
    iframe.addEventListener('load', handleLoad);
    
    // Also try after a delay in case it's already loaded
    setTimeout(scrollToSection, 500);

    return () => iframe.removeEventListener('load', handleLoad);
  }, [currentPage, homeownerId]);

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
        {manualHtml ? (
          <iframe 
            ref={iframeRef}
            srcDoc={manualHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
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
  );
};

export default HomeownerManual;
