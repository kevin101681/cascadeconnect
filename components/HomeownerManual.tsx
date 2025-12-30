import React, { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const HomeownerManual: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [sectionHeight, setSectionHeight] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Define pages based on logical sections in the manual
  const pages = [
    { id: 1, title: 'Cover & Quick Reference', scrollTo: 0 },
    { id: 2, title: 'Understanding Your Warranty Team', scrollTo: '.page:nth-of-type(2)' },
    { id: 3, title: 'Emergency: No Heat', scrollTo: '.page:nth-of-type(3)' },
    { id: 4, title: 'Emergency: Plumbing Leaks', scrollTo: '.page:nth-of-type(4)' },
    { id: 5, title: 'Glossary & Contacts', scrollTo: '.page:nth-of-type(5)' },
    { id: 6, title: 'Notes', scrollTo: '.page:nth-of-type(6)' },
  ];

  const totalPages = pages.length;

  // Scroll to the correct section when page changes and measure height
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      const iframe = iframeRef.current;
      
      // Wait for iframe to load before scrolling
      const handleLoad = () => {
        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const page = pages[currentPage - 1];
        let element: Element | null = null;

        if (typeof page.scrollTo === 'number') {
          iframe.contentWindow?.scrollTo({ top: page.scrollTo, behavior: 'smooth' });
          // For cover page, get the cover element
          element = iframeDoc.querySelector('.cover');
        } else {
          element = iframeDoc.querySelector(page.scrollTo);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }

        // Measure the height of the current section
        if (element) {
          const height = element.scrollHeight;
          // Add some padding and account for header
          setSectionHeight(Math.min(height + 100, window.innerHeight - 150));
        } else {
          setSectionHeight(null);
        }
      };

      if (iframe.contentDocument?.readyState === 'complete') {
        handleLoad();
      } else {
        iframe.addEventListener('load', handleLoad);
        return () => iframe.removeEventListener('load', handleLoad);
      }
    }
  }, [currentPage, pages]);

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
    <div className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-1 overflow-hidden flex flex-col">
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
      
      {/* Manual Content - Dynamic Height */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ 
          height: sectionHeight ? `${sectionHeight}px` : 'calc(100vh - 280px)',
          minHeight: '400px',
          maxHeight: 'calc(100vh - 200px)'
        }}
      >
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
