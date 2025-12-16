
import { jsPDF } from 'jspdf';
import { Claim } from '../types';

// Helper function to load image and return as data URL with dimensions
const loadImageAsDataUrl = (url: string): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', 0.8), // Convert to JPEG with 80% quality
            width: img.width,
            height: img.height
          });
        } else {
          reject(new Error('Could not get canvas context'));
        }
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

// Helper function to get image format from URL
const getImageFormat = (url: string): string => {
  if (url.startsWith('data:')) {
    const match = url.match(/data:image\/([^;]+)/);
    return match ? match[1].toUpperCase() : 'JPEG';
  }
  const ext = url.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'PNG';
  if (ext === 'jpg' || ext === 'jpeg') return 'JPEG';
  return 'JPEG'; // Default
};

export const generateServiceOrderPDF = async (claim: Claim, summary: string, returnUrl: boolean = false): Promise<string | void> => {
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
  cursorY += 6;
  // Use Job Name
  doc.text(`Job: ${claim.jobName || 'N/A'}`, margin, cursorY);
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

  // Add image thumbnails if available
  const imageAttachments = (claim.attachments || []).filter(att => att.type === 'IMAGE' && att.url);
  
  if (imageAttachments.length > 0) {
    cursorY += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Attached Images:', margin, cursorY);
    cursorY += 10;

    const thumbnailSize = 40; // Size of each thumbnail in mm
    const imagesPerRow = 4;
    const pageWidth = 210 - (2 * margin); // A4 width minus margins
    const spacing = (pageWidth - (imagesPerRow * thumbnailSize)) / (imagesPerRow - 1);
    let currentX = margin;
    let rowCount = 0;

    for (let i = 0; i < imageAttachments.length; i++) {
      const attachment = imageAttachments[i];
      
      // Check if we need a new page
      if (cursorY + thumbnailSize > 270) {
        doc.addPage();
        cursorY = 20;
        currentX = margin;
        rowCount = 0;
      }

      // Check if we need a new row
      if (i > 0 && i % imagesPerRow === 0) {
        cursorY += thumbnailSize + 5;
        currentX = margin;
        rowCount++;
        
        // Check if we need a new page after starting a new row
        if (cursorY + thumbnailSize > 270) {
          doc.addPage();
          cursorY = 20;
          currentX = margin;
          rowCount = 0;
        }
      }

      try {
        // Load and add image
        const { dataUrl, width, height } = await loadImageAsDataUrl(attachment.url);
        const format = getImageFormat(dataUrl);
        
        // Calculate dimensions to maintain aspect ratio
        const aspectRatio = width / height;
        let imgWidth = thumbnailSize;
        let imgHeight = thumbnailSize;
        
        if (aspectRatio > 1) {
          // Landscape: width is the limiting factor
          imgHeight = thumbnailSize / aspectRatio;
        } else {
          // Portrait or square: height is the limiting factor
          imgWidth = thumbnailSize * aspectRatio;
        }
        
        // Center the image within the thumbnail area
        const offsetX = (thumbnailSize - imgWidth) / 2;
        const offsetY = (thumbnailSize - imgHeight) / 2;
        
        doc.addImage(dataUrl, format, currentX + offsetX, cursorY + offsetY, imgWidth, imgHeight);
        
        // Add image label below thumbnail
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const labelText = attachment.name.length > 15 
          ? attachment.name.substring(0, 12) + '...' 
          : attachment.name;
        const labelWidth = doc.getTextWidth(labelText);
        doc.text(labelText, currentX + (thumbnailSize / 2) - (labelWidth / 2), cursorY + thumbnailSize + 5);
        
        currentX += thumbnailSize + spacing;
      } catch (error) {
        console.error(`Failed to load image ${attachment.name}:`, error);
        // Continue with next image even if one fails
      }
    }

    // Move cursor after images
    if (imageAttachments.length > 0) {
      const rows = Math.ceil(imageAttachments.length / imagesPerRow);
      cursorY += (rows * (thumbnailSize + 10)) + 10;
    }
  }

  // Signature Line
  // Check if we need a new page for signatures
  if (cursorY > 250) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, 100, cursorY);
  doc.setFontSize(10);
  doc.text('Homeowner Signature', margin, cursorY + 5);
  
  doc.line(120, cursorY, 190, cursorY);
  doc.text('Technician Signature', 120, cursorY + 5);

  // Generate filename with claim number
  const claimNumber = claim.claimNumber || claim.id.substring(0, 8).toUpperCase();
  const filename = `Service Order - ${claimNumber}.pdf`;

  if (returnUrl) {
    return doc.output('bloburl').toString();
  }

  doc.save(filename);
};
