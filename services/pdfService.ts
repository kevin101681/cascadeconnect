import { jsPDF } from 'jspdf';
import { Claim } from '../types';

export const generateServiceOrderPDF = (claim: Claim, summary: string, returnUrl: boolean = false): string | void => {
  const doc = new jsPDF();
  const margin = 20;
  let cursorY = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(60, 107, 128); // Brand color #3c6b80
  doc.text('Warranty Service Order', margin, cursorY);
  
  cursorY += 15;
  
  // Claim Details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Order ID: ${claim.id}`, margin, cursorY);
  cursorY += 8;
  
  doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, margin, cursorY);
  cursorY += 15;

  // Contractor Info
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, cursorY - 5, 170, 25, 'F');
  doc.text('Sub Assignment:', margin + 5, cursorY + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(claim.contractorName || 'Pending Assignment', margin + 5, cursorY + 10);
  cursorY += 30;

  // Location Info
  doc.setFont('helvetica', 'bold');
  doc.text('Service Location:', margin, cursorY);
  cursorY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(claim.homeownerName, margin, cursorY);
  cursorY += 6;
  doc.text(claim.address, margin, cursorY);
  cursorY += 15;

  // Issue Description
  doc.setFont('helvetica', 'bold');
  doc.text('Issue Summary:', margin, cursorY);
  cursorY += 8;
  doc.setFont('helvetica', 'normal');
  
  const splitTitle = doc.splitTextToSize(summary || claim.description, 170);
  doc.text(splitTitle, margin, cursorY);
  
  cursorY += (splitTitle.length * 7) + 10;

  // Original Description
  doc.setFont('helvetica', 'bold');
  doc.text('Homeowner Report:', margin, cursorY);
  cursorY += 8;
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(claim.description, 170);
  doc.text(splitDesc, margin, cursorY);

  cursorY += (splitDesc.length * 7) + 20;

  // Signature Line
  doc.setLineWidth(0.5);
  doc.line(margin, 270, 100, 270);
  doc.setFontSize(10);
  doc.text('Homeowner Signature', margin, 275);
  
  doc.line(120, 270, 190, 270);
  doc.text('Technician Signature', 120, 275);

  if (returnUrl) {
    return doc.output('bloburl').toString();
  }

  doc.save(`ServiceOrder_${claim.id}.pdf`);
};