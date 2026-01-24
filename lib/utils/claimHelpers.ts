/**
 * Claim-related utility functions
 * Pure functions with no dependencies on React hooks or component state
 */

import type { Claim, ClaimMessage } from '../../types';
import { ClaimStatus } from '../../types';

/**
 * Formats a claim number from a claim object
 * @param claim - Claim object
 * @returns Formatted claim number (e.g., "ABC12345" or first 8 chars of ID)
 */
export function formatClaimNumber(claim: Claim): string {
  return claim.claimNumber || claim.id.substring(0, 8).toUpperCase();
}

/**
 * Checks if a claim is completed
 * @param claim - Claim object
 * @returns True if claim status is COMPLETED
 */
export function isClaimCompleted(claim: Claim): boolean {
  return claim.status === ClaimStatus.COMPLETED;
}

/**
 * Checks if a claim is open (not completed)
 * @param claim - Claim object
 * @returns True if claim status is not COMPLETED
 */
export function isClaimOpen(claim: Claim): boolean {
  return claim.status !== ClaimStatus.COMPLETED;
}

/**
 * Checks if a claim is reviewed
 * @param claim - Claim object
 * @returns True if claim is marked as reviewed
 */
export function isClaimReviewed(claim: Claim): boolean {
  return claim.reviewed || false;
}

/**
 * Finds the accepted scheduled date from proposed dates
 * @param claim - Claim object
 * @returns Accepted proposed date object or undefined
 */
export function findAcceptedScheduledDate(claim: Claim) {
  return claim.proposedDates?.find(d => d.status === 'ACCEPTED');
}

/**
 * Finds the most recent service order message timestamp for a claim
 * @param claimId - ID of the claim
 * @param claimMessages - Array of all claim messages
 * @returns ISO timestamp string or null
 */
export function findServiceOrderDate(claimId: string, claimMessages: ClaimMessage[]): string | null {
  const serviceOrderMessages = claimMessages
    .filter(m => 
      m.claimId === claimId && 
      m.type === 'SUBCONTRACTOR' && 
      m.subject.toLowerCase().includes('service order')
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return serviceOrderMessages.length > 0 ? serviceOrderMessages[0].timestamp : null;
}

/**
 * Calculates claim counts by status
 * @param claims - Array of claims
 * @returns Object with openCount, closedCount, and totalCount
 */
export function calculateClaimCounts(claims: Claim[]) {
  const openCount = claims.filter(claim => claim.status !== ClaimStatus.CLOSED).length;
  const closedCount = claims.filter(claim => claim.status === ClaimStatus.CLOSED).length;
  const totalCount = claims.length;
  
  return { openCount, closedCount, totalCount };
}

/**
 * Filters claims by status
 * @param claims - Array of claims
 * @param filter - Filter type ('All', 'Open', or 'Closed')
 * @returns Filtered array of claims
 */
export function filterClaimsByStatus(claims: Claim[], filter: 'All' | 'Open' | 'Closed'): Claim[] {
  if (filter === 'Open') {
    return claims.filter(c => c.status !== ClaimStatus.COMPLETED);
  }
  if (filter === 'Closed') {
    return claims.filter(c => c.status === ClaimStatus.COMPLETED);
  }
  return claims;
}

/**
 * Generates an Excel filename with filter and date
 * @param filter - Claims filter type
 * @returns Filename string
 */
export function generateClaimsExcelFileName(filter: 'All' | 'Open' | 'Closed'): string {
  const dateStr = new Date().toISOString().split('T')[0];
  return `Warranty_Claims_${filter}_${dateStr}.xlsx`;
}

/**
 * Prepares claim data for Excel export
 * @param claims - Array of claims to export
 * @returns Array of objects formatted for Excel
 */
export function prepareClaimsForExport(claims: Claim[]) {
  return claims.map(claim => {
    const scheduledDate = findAcceptedScheduledDate(claim);
    return {
      'Claim #': formatClaimNumber(claim),
      'Status': claim.status,
      'Title': claim.title,
      'Description': claim.description || '',
      'Classification': claim.classification || '',
      'Homeowner': claim.homeownerName || '',
      'Contractor': claim.contractorName || '',
      'Scheduled Date': scheduledDate ? new Date(scheduledDate.date).toLocaleDateString() : '',
      'Date Submitted': new Date(claim.dateSubmitted).toLocaleDateString(),
      'Date Evaluated': claim.dateEvaluated ? new Date(claim.dateEvaluated).toLocaleDateString() : '',
      'Attachments': claim.attachments?.length || 0
    };
  });
}
