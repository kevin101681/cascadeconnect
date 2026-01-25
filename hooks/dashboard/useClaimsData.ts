/**
 * Custom hook for managing claims state and logic
 * Handles filtering, selection, and bulk operations for warranty claims
 */

import { useState, useMemo, useCallback } from 'react';
import type { Claim } from '../../types';
import { ClaimStatus } from '../../types';
import { filterClaimsByStatus, calculateClaimCounts, prepareClaimsForExport, generateClaimsExcelFileName } from '../../lib/utils/claimHelpers';
import * as claimService from '../../services/claimService';

export interface UseClaimsDataParams {
  claims: Claim[];
  initialFilter?: 'All' | 'Open' | 'Closed';
  onClaimDeleted?: (claimId: string) => void; // Callback to notify parent of deletion
  onClaimsDeleted?: (claimIds: string[]) => void; // Callback for bulk deletion
}

export interface UseClaimsDataReturn {
  // Filter state
  filter: 'All' | 'Open' | 'Closed';
  setFilter: (filter: 'All' | 'Open' | 'Closed') => void;
  
  // Filtered data
  filteredClaims: Claim[];
  claimCounts: {
    openCount: number;
    closedCount: number;
    totalCount: number;
  };
  
  // Selection state (for bulk operations)
  selectedClaimIds: string[];
  toggleClaimSelection: (claimId: string) => void;
  clearSelection: () => void;
  
  // UI state for new claim modal
  isCreatingNewClaim: boolean;
  setIsCreatingNewClaim: (isCreating: boolean) => void;
  
  // Export functionality
  exportToExcel: (claimsList: Claim[]) => Promise<void>;
  
  // Database operations
  deleteClaim: (claimId: string, onSuccess?: () => void) => Promise<void>;
  bulkDeleteClaims: (onSuccess?: () => void) => Promise<void>;
}

/**
 * Hook for managing claims filtering, selection, and UI state
 */
export function useClaimsData({ 
  claims, 
  initialFilter = 'Open',
  onClaimDeleted,
  onClaimsDeleted
}: UseClaimsDataParams): UseClaimsDataReturn {
  // Filter state
  const [filter, setFilter] = useState<'All' | 'Open' | 'Closed'>(initialFilter);
  
  // Selection state for bulk operations
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  
  // UI state for new claim creation
  const [isCreatingNewClaim, setIsCreatingNewClaim] = useState(false);
  
  // Memoized filtered claims based on current filter
  const filteredClaims = useMemo(() => {
    return filterClaimsByStatus(claims, filter);
  }, [claims, filter]);
  
  // Memoized claim counts
  const claimCounts = useMemo(() => {
    return calculateClaimCounts(claims);
  }, [claims]);
  
  // Toggle claim selection for bulk operations
  const toggleClaimSelection = useCallback((claimId: string) => {
    setSelectedClaimIds(prev => 
      prev.includes(claimId)
        ? prev.filter(id => id !== claimId)
        : [...prev, claimId]
    );
  }, []);
  
  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedClaimIds([]);
  }, []);
  
  // Export claims to Excel
  const exportToExcel = useCallback(async (claimsList: Claim[]) => {
    try {
      // Filter claims based on current filter
      const filteredClaims = filterClaimsByStatus(claimsList, filter);
      
      // Prepare data for Excel using utility
      const excelData = prepareClaimsForExport(filteredClaims);
      
      // Lazy load XLSX library
      const XLSX = await import('xlsx');
      
      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Claims');
      
      // Generate Excel file and download
      const fileName = generateClaimsExcelFileName(filter);
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Failed to export to Excel:', err);
      alert('Failed to export to Excel. Please try again.');
    }
  }, [filter]);
  
  // Delete a single claim
  const deleteClaim = useCallback(async (claimId: string, onSuccess?: () => void) => {
    try {
      // Call service to delete from database
      await claimService.deleteClaim(claimId);
      
      // Remove from multi-select if it was checked
      setSelectedClaimIds(prev => prev.filter(id => id !== claimId));
      
      // Notify parent component to refresh data
      if (onClaimDeleted) {
        onClaimDeleted(claimId);
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      console.log('Claim deleted successfully');
    } catch (error) {
      console.error('Failed to delete claim:', error);
      alert('Failed to delete claim. Please try again.');
      throw error;
    }
  }, [onClaimDeleted]);
  
  // Bulk delete selected claims
  const bulkDeleteClaims = useCallback(async (onSuccess?: () => void) => {
    if (selectedClaimIds.length === 0) {
      return;
    }
    
    const confirmMessage = `Are you sure you want to delete ${selectedClaimIds.length} claim${selectedClaimIds.length > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      // Call service to delete from database
      const deletedCount = await claimService.bulkDeleteClaims(selectedClaimIds);
      
      // Clear selection
      clearSelection();
      
      // Notify parent component to refresh data
      if (onClaimsDeleted) {
        onClaimsDeleted(selectedClaimIds);
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      console.log(`${deletedCount} claims deleted successfully`);
    } catch (error) {
      console.error('Failed to delete claims:', error);
      alert('Failed to delete claims. Please try again.');
      throw error;
    }
  }, [selectedClaimIds, clearSelection, onClaimsDeleted]);
  
  return {
    filter,
    setFilter,
    filteredClaims,
    claimCounts,
    selectedClaimIds,
    setSelectedClaimIds,
    toggleClaimSelection,
    clearSelection,
    isCreatingNewClaim,
    setIsCreatingNewClaim,
    exportToExcel,
    deleteClaim,
    bulkDeleteClaims
  };
}
