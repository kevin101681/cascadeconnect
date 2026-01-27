/**
 * TASK CREATION CARD
 * Persistent sticky card for creating new tasks
 * Sits at top of left sidebar (Tasks List)
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { DropdownButton } from './ui/dropdown-button';
import { ChevronDown } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
}

interface TaskCreationCardProps {
  employees: Employee[];
  onCreateScheduleTask?: (assigneeId: string) => Promise<void>;
  onCreateEvalTask?: (type: '60 Day' | '11 Month' | 'Other', assigneeId: string) => Promise<void>;
}

export const TaskCreationCard: React.FC<TaskCreationCardProps> = ({
  employees,
  onCreateScheduleTask,
  onCreateEvalTask,
}) => {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleCreateTask = async (taskType: 'schedule' | 'eval', evalType?: '60 Day' | '11 Month' | 'Other') => {
    if (!selectedAssignee) return;

    if (taskType === 'schedule' && onCreateScheduleTask) {
      await onCreateScheduleTask(selectedAssignee);
      setSelectedAssignee(''); // Reset after creation
    } else if (taskType === 'eval' && evalType && onCreateEvalTask) {
      await onCreateEvalTask(evalType, selectedAssignee);
      setSelectedAssignee(''); // Reset after creation
    }
  };

  const selectedEmployee = employees.find(emp => emp.id === selectedAssignee);

  return (
    <div className="flex items-center gap-3">
      {/* Assign To Label (Compact) */}
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
        Assign to:
      </span>
      
      {/* User Select Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-48 h-9 flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-gray-700 text-surface-on dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
        >
          <span className={selectedEmployee ? 'text-surface-on dark:text-gray-100 truncate' : 'text-gray-500 dark:text-gray-400'}>
            {selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.role})` : 'Select User...'}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2" />
        </button>
        
        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsDropdownOpen(false)}
            />
            
            {/* Menu */}
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg shadow-elevation-2 z-20 max-h-60 overflow-y-auto">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedAssignee(emp.id);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface-container dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="font-medium text-surface-on dark:text-gray-100">
                    {emp.name}
                  </div>
                  <div className="text-xs text-surface-on-variant dark:text-gray-400">
                    {emp.role}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action Buttons (Horizontal) */}
      {onCreateEvalTask && (
        <DropdownButton
          label="Evaluation"
          variant="outlined"
          className="!h-9 !px-3 !min-w-0 !rounded-lg"
          disabled={!selectedAssignee}
          options={[
            { 
              label: '60 Day', 
              onClick: () => handleCreateTask('eval', '60 Day')
            },
            { 
              label: '11 Month', 
              onClick: () => handleCreateTask('eval', '11 Month')
            },
            { 
              label: 'Other', 
              onClick: () => handleCreateTask('eval', 'Other')
            },
          ]}
        />
      )}
      {onCreateScheduleTask && (
        <Button
          variant="outlined"
          onClick={() => handleCreateTask('schedule')}
          disabled={!selectedAssignee}
          className="!h-9 !px-3 !min-w-0 !rounded-lg"
        >
          Schedule
        </Button>
      )}
    </div>
  );
};
