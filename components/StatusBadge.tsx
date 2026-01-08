import React from 'react';
import { ClaimStatus } from '../types';

interface StatusBadgeProps {
  status: ClaimStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // Match pill style: rounded-full, px-3, text-xs font-medium, h-6
  const baseStyle = "inline-flex items-center h-6 px-3 rounded-full text-xs font-medium whitespace-nowrap";

  const styles = {
    [ClaimStatus.SUBMITTED]: "bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-gray-300",
    [ClaimStatus.REVIEWING]: "bg-blue-100 dark:bg-gray-700 text-blue-800 dark:text-gray-300",
    [ClaimStatus.SCHEDULING]: "bg-blue-200 dark:bg-gray-700 text-blue-900 dark:text-gray-300",
    [ClaimStatus.SCHEDULED]: "bg-blue-500 dark:bg-primary/40 text-white dark:text-primary",
    [ClaimStatus.COMPLETED]: "bg-blue-600 dark:bg-gray-700 text-white dark:text-gray-100",
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