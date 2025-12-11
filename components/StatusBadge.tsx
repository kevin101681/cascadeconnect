import React from 'react';
import { ClaimStatus } from '../types';

interface StatusBadgeProps {
  status: ClaimStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // M3 Assist/Filter Chip style
  const baseStyle = "inline-flex items-center px-3 h-8 rounded-lg text-sm font-medium border transition-colors";

  const styles = {
    [ClaimStatus.SUBMITTED]: "bg-surface-container border-surface-outline text-surface-on-variant",
    [ClaimStatus.REVIEWING]: "bg-secondary-container border-secondary-container text-secondary-on-container",
    [ClaimStatus.SCHEDULING]: "bg-tertiary-container border-tertiary-container text-tertiary-on-container",
    [ClaimStatus.SCHEDULED]: "bg-primary-container border-primary-container text-primary-on-container",
    [ClaimStatus.COMPLETED]: "bg-green-100 border-green-200 text-green-800", // Custom success color outside M3 base palette
  };

  return (
    <span className={`${baseStyle} ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default StatusBadge;