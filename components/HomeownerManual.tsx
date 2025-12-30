import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const HomeownerManual: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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

  // Scroll to the correct section when page changes
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      const iframe = iframeRef.current;
      
      // Wait for iframe to load before scrolling
      const handleLoad = () => {
        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const page = pages[currentPage - 1];
        if (typeof page.scrollTo === 'number') {
          iframe.contentWindow?.scrollTo({ top: page.scrollTo, behavior: 'smooth' });
        } else {
          const element = iframeDoc.querySelector(page.scrollTo);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
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

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

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
    <div className="bg-primary/10 dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 shadow-elevation-1 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Header with Pagination Controls */}
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
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Download PDF Button */}
            <button
              onClick={downloadAsPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-on hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
              title="Download as PDF"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-on border-t-transparent"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </button>

            {/* Pagination Navigation */}
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-surface dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Previous section"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-surface-on dark:text-gray-100">
                  {currentPage} / {totalPages}
                </span>
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-surface dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 text-surface-on dark:text-gray-100 hover:bg-surface-container dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Next section"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page Indicators */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setCurrentPage(page.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentPage === page.id
                  ? 'bg-primary text-primary-on'
                  : 'bg-surface dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-gray-600'
              }`}
            >
              {page.title}
            </button>
          ))}
        </div>
      </div>
      
      {/* Manual Content */}
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
