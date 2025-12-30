import React, { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const HomeownerManual: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Define pages based on actual HTML structure
  // Structure: .cover, then .page elements in order
  const pages = [
    { id: 1, title: 'Cover & Quick Reference', selector: '.cover' },
    { id: 2, title: 'Understanding Your Warranty Team', selector: 'body > .page:nth-of-type(3)' },
    { id: 3, title: 'Emergency: No Heat', selector: 'body > .page:nth-of-type(4)' },
    { id: 4, title: 'Emergency: Plumbing Leaks', selector: 'body > .page:nth-of-type(5)' },
    { id: 5, title: 'Glossary & Contacts', selector: 'body > .page:nth-of-type(6)' },
    { id: 6, title: 'Notes', selector: 'body > .page:nth-of-type(7)' },
  ];

  // Scroll to the correct section when page changes
  useEffect(() => {
    const scrollToSection = () => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow?.document) return;

      const iframeDoc = iframe.contentWindow.document;
      const page = pages[currentPage - 1];
      
      if (!page) return;

      const element = iframeDoc.querySelector(page.selector) as HTMLElement;
      
      if (element) {
        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log(`Scrolled to section ${currentPage}: ${page.title}`, element);
      } else {
        console.error(`Element not found for selector: ${page.selector}`);
      }
    };

    const iframe = iframeRef.current;
    if (!iframe) return;

    // If iframe is already loaded, scroll immediately
    if (iframe.contentDocument?.readyState === 'complete') {
      // Small delay to ensure rendering is complete
      setTimeout(scrollToSection, 50);
    } else {
      // Otherwise wait for load
      const handleLoad = () => setTimeout(scrollToSection, 50);
      iframe.addEventListener('load', handleLoad);
      return () => iframe.removeEventListener('load', handleLoad);
    }
  }, [currentPage]);

  const downloadAsPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow?.document) {
        throw new Error('Unable to access manual content');
      }

      const iframeDoc = iframe.contentWindow.document;
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Get all page sections from the manual
      const pageSections = iframeDoc.querySelectorAll('.page, .cover');
      
      for (let i = 0; i < pageSections.length; i++) {
        const section = pageSections[i] as HTMLElement;
        
        // Capture the section as an image
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: section.classList.contains('cover') ? null : '#ffffff',
          windowWidth: 850,
          windowHeight: section.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Calculate dimensions to fit the page while maintaining aspect ratio
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        // Add a new page for each section (except the first one)
        if (i > 0) {
          pdf.addPage();
        }
        
        // If the image is taller than the page, split it across multiple pages
        if (imgHeight > pdfHeight) {
          let heightLeft = imgHeight;
          let position = 0;
          
          while (heightLeft > 0) {
            if (position > 0) {
              pdf.addPage();
            }
            
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
            position -= pdfHeight;
          }
        } else {
          // Center vertically if shorter than page
          const yOffset = (pdfHeight - imgHeight) / 2;
          pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
        }
      }

      // Save the PDF
      pdf.save('Cascade-Homeowner-Manual.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-1 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Header with Download Button */}
      <div className="px-6 py-4 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-normal text-surface-on dark:text-gray-100">
              Homeowner Manual
            </h2>
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
              {pages[currentPage - 1]?.title}
            </p>
          </div>
          
          {/* Download PDF Button */}
          <button
            onClick={downloadAsPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            style={{ backgroundColor: '#3C6B80' }}
            title="Download as PDF"
          >
            {isGeneratingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </button>
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
                  : 'bg-surface dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-600'
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
          src="/complete_homeowner_manual.html" 
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Homeowner Manual"
        />
      </div>
    </div>
  );
};

export default HomeownerManual;
