import React, { useState, useEffect } from 'react';
import { Task, InternalEmployee, Claim, Homeowner, ClaimStatus } from '../types';
import Button from './Button';
import ModalWrapper from './ModalWrapper';
import { Check, Plus, User, Calendar, Trash2, Home, CheckCircle, Square, CheckSquare, HardHat } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface TaskListProps {
  tasks: Task[];
  employees: InternalEmployee[];
  currentUser: InternalEmployee; // Simulating logged in admin
  claims: Claim[];
  homeowners: Homeowner[];
  onAddTask: (task: Partial<Task>) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  preSelectedHomeowner?: Homeowner | null;
  onClose?: () => void;
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  employees, 
  currentUser,
  claims,
  homeowners, 
  onAddTask, 
  onToggleTask,
  onDeleteTask,
  preSelectedHomeowner,
  onClose
}) => {
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(currentUser.id);
  const [newTaskNotes, setNewTaskNotes] = useState('');
  
  // New State for Linking Claims
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);

  // Filter to only show tasks assigned to the current user
  const filteredTasks = tasks.filter(t => t.assignedToId === currentUser.id);

  // Get open claims for selected homeowner (only if context exists)
  const openClaims = preSelectedHomeowner 
    ? claims.filter(c => {
        const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
        const homeownerEmail = preSelectedHomeowner.email?.toLowerCase().trim() || '';
        return claimEmail === homeownerEmail && c.status !== ClaimStatus.COMPLETED;
      })
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTask({
      title: newTaskTitle,
      assignedToId: newTaskAssignee,
      description: newTaskNotes,
      assignedById: currentUser.id,
      isCompleted: false,
      relatedClaimIds: selectedClaimIds
    });
    
    // Reset Form
    setNewTaskTitle('');
    setNewTaskNotes('');
    setNewTaskAssignee(currentUser.id);
    setSelectedClaimIds([]);
    setShowForm(false);
  };

  const toggleClaimSelection = (claimId: string) => {
    setSelectedClaimIds(prev => 
      prev.includes(claimId) 
        ? prev.filter(id => id !== claimId) 
        : [...prev, claimId]
    );
  };

  return (
    <ModalWrapper
      title="My Tasks"
      subtitle={`${filteredTasks.length} ${filteredTasks.length === 1 ? 'task' : 'tasks'}`}
      onClose={onClose || (() => {})}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {showForm && (
          <div className="bg-surface dark:bg-gray-800 rounded-2xl border border-surface-outline-variant dark:border-gray-700 p-5 animate-in slide-in-from-top-2">
            <h3 className="font-medium text-surface-on dark:text-gray-100 mb-4">New Task</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">Task Title</label>
                    <input
                        type="text"
                        className="w-full bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 focus:border-primary focus:outline-none"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        required
                    />
              </div>
              
              <div>
                <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">Assigned To</label>
                <select 
                        className="w-full bg-surface-container dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border border-surface-outline-variant dark:border-gray-600"
                        value={newTaskAssignee}
                        onChange={e => setNewTaskAssignee(e.target.value)}
                    >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">Date Assigned</label>
                <div className="w-full bg-surface-container/50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-sm border border-surface-outline-variant dark:border-gray-600 text-surface-on-variant dark:text-gray-400 cursor-not-allowed">
                  {new Date().toLocaleDateString()} (Today)
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">Notes / Description</label>
                <textarea
                        rows={3}
                        className="w-full bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg px-3 py-2 text-surface-on dark:text-gray-100 focus:border-primary focus:outline-none resize-none"
                        value={newTaskNotes}
                  onChange={e => setNewTaskNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Claims Checklist - Only shown if preSelectedHomeowner is present */}
            {preSelectedHomeowner && (
              <div className="bg-surface-container/30 dark:bg-gray-700/30 p-4 rounded-xl border border-surface-outline-variant/50 dark:border-gray-600/50">
                <label className="text-xs text-surface-on-variant dark:text-gray-400 font-medium flex items-center gap-1 mb-2">
                  <Home className="h-3 w-3" />
                  Link to Open Warranty Claims for {preSelectedHomeowner.name}
                </label>

                <div className="space-y-2 mt-2">
                  {openClaims.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {openClaims.map(claim => {
                        const isSelected = selectedClaimIds.includes(claim.id);
                        return (
                          <div 
                            key={claim.id} 
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-surface dark:bg-gray-800 border-primary ring-1 ring-primary' 
                                : 'bg-surface dark:bg-gray-800 border-surface-outline-variant dark:border-gray-600 hover:border-surface-outline dark:hover:border-gray-500'
                            }`} 
                            onClick={() => toggleClaimSelection(claim.id)}
                          >
                             <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-surface-outline dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                                  {isSelected && <Check className="h-3.5 w-3.5" />}
                             </div>
                             <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                      <span className={`font-medium text-sm ${isSelected ? 'text-primary' : 'text-surface-on dark:text-gray-100'}`}>{claim.title}</span>
                                      <StatusBadge status={claim.status} />
                                  </div>
                                  <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1 line-clamp-1">{claim.description}</p>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-surface-on-variant dark:text-gray-400 italic bg-surface dark:bg-gray-800 p-2 rounded text-center">
                      No open claims found for this homeowner.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="text" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit">Save Task</Button>
            </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
          <div className="text-center py-10 text-surface-on-variant dark:text-gray-400 bg-surface-container/30 dark:bg-gray-700/30 rounded-2xl border border-dashed border-surface-outline-variant dark:border-gray-600">
            <p>No tasks assigned to you.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const assignee = employees.find(e => e.id === task.assignedToId);
            
            // Resolve related claims for checklist display
            const taskClaims = task.relatedClaimIds 
                ? claims.filter(c => task.relatedClaimIds?.includes(c.id))
                : [];

            return (
              <div 
                key={task.id} 
                className={`group flex flex-col gap-4 p-5 rounded-2xl border transition-all ${
                  task.isCompleted 
                    ? 'bg-surface-container/30 dark:bg-gray-700/30 border-surface-container-high dark:border-gray-600 opacity-75' 
                    : 'bg-surface dark:bg-gray-800 border-surface-outline-variant dark:border-gray-700 shadow-sm hover:shadow-elevation-1'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <button 
                            onClick={() => onToggleTask(task.id)}
                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 ${
                                task.isCompleted 
                                ? 'bg-primary border-primary text-white' 
                                : 'border-surface-outline dark:border-gray-600 hover:border-primary'
                            }`}
                        >
                            {task.isCompleted && <Check className="h-3.5 w-3.5" />}
                        </button>

                        <div className="flex-1">
                            {/* Title Pill */}
                            <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm mb-2 ${
                                task.isCompleted 
                                ? 'bg-surface-container dark:bg-gray-700 text-surface-on-variant dark:text-gray-400 line-through' 
                                : 'bg-primary-container text-primary-on-container'
                            }`}>
                                {task.title}
                            </span>
                            
                            {/* Meta Data Row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-surface-on-variant dark:text-gray-400 ml-1">
                                <span className="flex items-center gap-1.5">
                                    <User className="h-3 w-3" />
                                    Assigned to: <span className="font-medium text-surface-on dark:text-gray-100">{assignee?.name || 'Unknown'}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3" />
                                    Assigned: {task.dateAssigned ? new Date(task.dateAssigned).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => onDeleteTask(task.id)}
                        className="p-2 text-surface-outline-variant dark:text-gray-500 hover:text-error hover:bg-error/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Task"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>

                {/* Notes Section - Pill Style */}
                {task.description && (
                    <div className="ml-9 mt-1">
                        <div className="inline-block bg-surface-container-high/60 dark:bg-gray-700/60 px-4 py-2 rounded-2xl text-sm text-surface-on dark:text-gray-100">
                            <p className="whitespace-pre-wrap">{task.description}</p>
                        </div>
                    </div>
                )}

                {/* Checklist of Claims */}
                {taskClaims.length > 0 && (
                     <div className="ml-9 mt-2">
                        <p className="text-xs font-bold text-surface-on-variant dark:text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            Subs to Schedule
                        </p>
                        <div className="space-y-2">
                            {taskClaims.map(claim => (
                                <div key={claim.id} className="flex items-center justify-between p-2.5 rounded-lg border border-surface-outline-variant dark:border-gray-600 bg-surface dark:bg-gray-800 text-sm">
                                    <div className="flex items-center gap-3">
                                        <Square className="h-4 w-4 text-primary flex-shrink-0" />
                                        <div>
                                            <span className="font-medium text-surface-on dark:text-gray-100 block">{claim.title}</span>
                                            <div className="flex items-center flex-wrap gap-1 text-xs text-surface-on-variant dark:text-gray-400">
                                                <span>{claim.id}</span>
                                                <span>•</span>
                                                <span>{claim.classification}</span>
                                                {claim.contractorName && (
                                                    <>
                                                         <span className="mx-1 text-surface-outline-variant dark:text-gray-600">|</span>
                                                         <span className="font-medium text-surface-on-variant dark:text-gray-400 flex items-center gap-1 bg-surface-container dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                            <HardHat className="h-3 w-3" />
                                                            {claim.contractorName}
                                                         </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                )}
              </div>
            );
          })
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};

export default TaskList;