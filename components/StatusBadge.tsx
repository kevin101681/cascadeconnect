import React from 'react';
import { ClaimStatus } from '../types';

interface StatusBadgeProps {
  status: ClaimStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // M3 Assist/Filter Chip style with colored status pills
  const baseStyle = "inline-flex items-center px-3 h-8 rounded-lg text-sm font-medium border transition-colors";

  const styles = {
    [ClaimStatus.SUBMITTED]: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
    [ClaimStatus.REVIEWING]: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200",
    [ClaimStatus.SCHEDULING]: "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200",
    [ClaimStatus.SCHEDULED]: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200",
    [ClaimStatus.COMPLETED]: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200",
  };

  return (
    <span className={`${baseStyle} ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default StatusBadge;