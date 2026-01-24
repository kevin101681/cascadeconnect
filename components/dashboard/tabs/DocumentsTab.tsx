/**
 * Documents Tab - Account Documents Management
 * 
 * Displays a grid of uploaded documents (PDFs, images) with actions:
 * - View/preview documents
 * - Download documents
 * - Print PDFs
 * - Save to Google Drive
 * - Delete documents (admin only)
 * - Upload new documents
 * 
 * Extracted from Dashboard.tsx (Phase 3)
 */

import React, { Suspense, useState } from 'react';
import { FileText, Download, Share2, Printer, Trash2, Eye, Plus, Upload, Loader2 } from 'lucide-react';
import type { HomeownerDocument, UserRole } from '../../../types';
import Button from '../../Button';

// Lazy-load heavy PDF viewer
const PdfFlipViewer3D = React.lazy(() => import('../../PdfFlipViewer3D'));

interface DocumentsTabProps {
  documents: HomeownerDocument[];
  isAdmin: boolean;
  onUploadDocument?: () => void;
  onDeleteDocument?: (docId: string) => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  documents,
  isAdmin,
  onUploadDocument,
  onDeleteDocument,
}) => {
  const [selectedDocument, setSelectedDocument] = useState<HomeownerDocument | null>(null);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);

  const displayDocuments = documents;

  return (
    <>
      <div className="flex flex-col h-full md:h-auto">
        <div className="bg-surface dark:bg-gray-800 rounded-3xl border border-surface-outline-variant dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700">
            <h2 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Account Documents
            </h2>
          </div>
        
          {/* Document Grid */}
          <div className="p-6 bg-surface dark:bg-gray-800">
            {displayDocuments.length === 0 ? (
              <div className="text-center text-sm text-surface-on-variant dark:text-gray-400 py-12 border border-dashed border-surface-outline-variant dark:border-gray-600 rounded-xl bg-surface-container/30 dark:bg-gray-700/30">
                No documents uploaded for this account.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayDocuments.map(doc => {
                  const isPDF = doc.type === 'PDF' || doc.name.toLowerCase().endsWith('.pdf') || 
                               doc.url.startsWith('data:application/pdf') || 
                               doc.url.includes('pdf');
                  
                  return (
                    <div key={doc.id} className="flex flex-col bg-surface-container dark:bg-gray-700 rounded-xl overflow-hidden border border-surface-outline-variant dark:border-gray-600 hover:shadow-lg transition-all relative group">
                      {/* Header with Action Buttons */}
                      <div className="absolute top-0 left-0 right-0 z-base bg-gradient-to-b from-black/70 to-transparent p-2 flex items-center justify-end gap-1">
                        {isPDF && (
                          <>
                            {/* Save to Google Drive */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = `https://drive.google.com/drive/folders`;
                                link.target = '_blank';
                                link.click();
                                if (doc.url.startsWith('data:')) {
                                  const downloadLink = document.createElement('a');
                                  downloadLink.href = doc.url;
                                  downloadLink.download = doc.name;
                                  document.body.appendChild(downloadLink);
                                  downloadLink.click();
                                  document.body.removeChild(downloadLink);
                                }
                              }}
                              className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                              title="Save to Google Drive"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                            
                            {/* Download */}
                            {doc.url.startsWith('data:') ? (
                              <a 
                                href={doc.url} 
                                download={doc.name} 
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(doc.url, '_blank');
                                }}
                                className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            )}
                            
                            {/* Print */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const printWindow = window.open('', '_blank');
                                if (printWindow && doc.url) {
                                  printWindow.document.write(`
                                    <html>
                                      <head><title>Print ${doc.name}</title></head>
                                      <body style="margin:0">
                                        <embed src="${doc.url}" width="100%" height="100%" type="application/pdf">
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                  setTimeout(() => printWindow.print(), 250);
                                }
                              }}
                              className="p-1.5 bg-white dark:bg-gray-800 text-surface-on dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-md transition-all flex items-center justify-center"
                              title="Print"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        
                        {/* Delete (Admin Only) */}
                        {isAdmin && onDeleteDocument && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm(`Delete "${doc.name}"?`)) {
                                onDeleteDocument(doc.id);
                              }
                            }}
                            className="p-1.5 bg-white dark:bg-gray-800 text-error hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shadow-md transition-all flex items-center justify-center"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Thumbnail */}
                      <button
                        onClick={() => {
                          setSelectedDocument(doc);
                          setIsPDFViewerOpen(true);
                        }}
                        className="relative w-full aspect-[3/4] bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform"
                      >
                        {isPDF ? (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <FileText className="h-12 w-12 text-error mb-2" />
                            <span className="text-xs text-surface-on-variant dark:text-gray-400 line-clamp-2">{doc.name}</span>
                          </div>
                        ) : (
                          <img 
                            src={doc.url} 
                            alt={doc.name} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </button>

                      {/* Document Name */}
                      <div className="p-3 bg-surface dark:bg-gray-800">
                        <p className="text-xs text-surface-on dark:text-gray-200 font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-0.5">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upload Action */}
          {isAdmin && onUploadDocument && (
            <div className="p-4 border-t border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30">
              <Button
                variant="outlined"
                onClick={onUploadDocument}
                icon={<Upload className="h-4 w-4" />}
                className="w-full"
              >
                Upload Document
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {isPDFViewerOpen && selectedDocument && (
        <div className="fixed inset-0 z-modal bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <button
            onClick={() => setIsPDFViewerOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-base"
            title="Close"
          >
            <Eye className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
          
          <div className="w-full h-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl m-4">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <PdfFlipViewer3D pdfUrl={selectedDocument.url} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentsTab;
