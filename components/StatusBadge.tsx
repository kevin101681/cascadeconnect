import React from 'react';
import { ClaimStatus } from '../types';

interface StatusBadgeProps {
  status: ClaimStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // Match pill style: rounded-full, px-3, text-xs font-medium, h-6
  const baseStyle = "inline-flex items-center h-6 px-3 rounded-full text-xs font-medium whitespace-nowrap";

  const styles = {
    [ClaimStatus.SUBMITTED]: "bg-surface-container-high dark:bg-gray-600 text-surface-on-variant dark:text-gray-300",
    [ClaimStatus.REVIEWING]: "bg-secondary-container dark:bg-gray-600 text-secondary-on-container dark:text-gray-300",
    [ClaimStatus.SCHEDULING]: "bg-tertiary-container dark:bg-gray-600 text-tertiary-on-container dark:text-gray-300",
    [ClaimStatus.SCHEDULED]: "bg-primary-container dark:bg-primary/30 text-primary-on-container dark:text-primary",
    [ClaimStatus.COMPLETED]: "bg-surface-container-high dark:bg-gray-600 text-surface-on dark:text-gray-100",
  };

  // Format status text (replace underscores with spaces and capitalize)
  const formatStatus = (status: ClaimStatus): string => {
    // Special case: SUBMITTED displays as "New"
    if (status === ClaimStatus.SUBMITTED) {
      return 'New';
    }
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <span className={`${baseStyle} ${styles[status]}`}>
      {formatStatus(status)}
    </span>
  );
};

export default StatusBadge;