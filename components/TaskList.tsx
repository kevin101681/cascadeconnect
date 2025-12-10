import React, { useState, useEffect } from 'react';
import { Task, InternalEmployee, Claim, Homeowner, ClaimStatus } from '../types';
import Button from './Button';
import { Check, Plus, User, Calendar, Trash2, Home, CheckCircle, Square, CheckSquare } from 'lucide-react';
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
  preSelectedHomeowner
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
    ? claims.filter(c => c.homeownerEmail === preSelectedHomeowner.email && c.status !== ClaimStatus.COMPLETED)
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="font-medium text-surface-on flex items-center gap-2">
          My Tasks
          <span className="bg-primary text-primary-on text-xs px-2 py-0.5 rounded-full">{filteredTasks.length}</span>
        </h3>
        <Button onClick={() => setShowForm(!showForm)} icon={<Plus className="h-4 w-4"/>}>
          Create Task
        </Button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-2xl border border-surface-outline-variant p-5 animate-in slide-in-from-top-2">
          <h3 className="font-medium text-surface-on mb-4">New Internal Task</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="text-xs text-surface-on-variant mb-1 block">Task Title</label>
                    <input
                        type="text"
                        placeholder="e.g. Follow up on HVAC repair"
                        className="w-full bg-surface-container border border-surface-outline-variant rounded-lg px-3 py-2 focus:border-primary focus:outline-none"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        required
                    />
                </div>
                
                <div>
                    <label className="text-xs text-surface-on-variant mb-1 block">Assigned To</label>
                    <select 
                        className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm border border-surface-outline-variant"
                        value={newTaskAssignee}
                        onChange={e => setNewTaskAssignee(e.target.value)}
                    >
                        {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-xs text-surface-on-variant mb-1 block">Date Assigned</label>
                    <div className="w-full bg-surface-container/50 rounded-lg px-3 py-2 text-sm border border-surface-outline-variant text-surface-on-variant cursor-not-allowed">
                        {new Date().toLocaleDateString()} (Today)
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="text-xs text-surface-on-variant mb-1 block">Notes / Description</label>
                    <textarea
                        rows={3}
                        placeholder="Add details about this task..."
                        className="w-full bg-surface-container border border-surface-outline-variant rounded-lg px-3 py-2 focus:border-primary focus:outline-none resize-none"
                        value={newTaskNotes}
                        onChange={e => setNewTaskNotes(e.target.value)}
                    />
                </div>
            </div>

            {/* Claims Checklist - Only shown if preSelectedHomeowner is present */}
            {preSelectedHomeowner && (
              <div className="bg-surface-container/30 p-4 rounded-xl border border-surface-outline-variant/50">
                <label className="text-xs text-surface-on-variant font-medium flex items-center gap-1 mb-2">
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
                                ? 'bg-surface border-primary ring-1 ring-primary' 
                                : 'bg-surface border-surface-outline-variant hover:border-surface-outline'
                            }`} 
                            onClick={() => toggleClaimSelection(claim.id)}
                          >
                             <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-surface-outline bg-white'}`}>
                                  {isSelected && <Check className="h-3.5 w-3.5" />}
                             </div>
                             <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                      <span className={`font-medium text-sm ${isSelected ? 'text-primary' : 'text-surface-on'}`}>{claim.title}</span>
                                      <StatusBadge status={claim.status} />
                                  </div>
                                  <p className="text-xs text-surface-on-variant mt-1 line-clamp-1">{claim.description}</p>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-surface-on-variant italic bg-surface p-2 rounded text-center">
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
          <div className="text-center py-10 text-surface-on-variant bg-surface-container/30 rounded-2xl border border-dashed border-surface-outline-variant">
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
                    ? 'bg-surface-container/30 border-surface-container-high opacity-75' 
                    : 'bg-surface border-surface-outline-variant shadow-sm hover:shadow-elevation-1'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <button 
                            onClick={() => onToggleTask(task.id)}
                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 ${
                                task.isCompleted 
                                ? 'bg-primary border-primary text-white' 
                                : 'border-surface-outline hover:border-primary'
                            }`}
                        >
                            {task.isCompleted && <Check className="h-3.5 w-3.5" />}
                        </button>

                        <div>
                            <p className={`font-bold text-lg ${task.isCompleted ? 'text-surface-on-variant line-through' : 'text-surface-on'}`}>
                                {task.title}
                            </p>
                            
                            {/* Meta Data Row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-surface-on-variant mt-2">
                                <span className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded">
                                    <User className="h-3 w-3" />
                                    Assigned to: <span className="font-medium text-surface-on">{assignee?.name || 'Unknown'}</span>
                                </span>
                                <span className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded">
                                    <Calendar className="h-3 w-3" />
                                    Assigned: {task.dateAssigned ? new Date(task.dateAssigned).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => onDeleteTask(task.id)}
                        className="p-2 text-surface-outline-variant hover:text-error hover:bg-error/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Task"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>

                {/* Notes Section */}
                {task.description && (
                    <div className="ml-9 text-sm text-surface-on bg-surface-container/30 p-3 rounded-lg border border-surface-outline-variant/50">
                        <p className="whitespace-pre-wrap">{task.description}</p>
                    </div>
                )}

                {/* Checklist of Claims */}
                {taskClaims.length > 0 && (
                     <div className="ml-9 mt-1">
                        <p className="text-xs font-bold text-surface-on-variant mb-2 uppercase tracking-wider flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            Target Warranty Claims (Checklist)
                        </p>
                        <div className="space-y-2">
                            {taskClaims.map(claim => (
                                <div key={claim.id} className="flex items-center justify-between p-2.5 rounded-lg border border-surface-outline-variant bg-surface text-sm">
                                    <div className="flex items-center gap-3">
                                        {/* Display Square to act as visual checklist item for the user */}
                                        <Square className="h-4 w-4 text-primary" />
                                        <div>
                                            <span className="font-medium text-surface-on block">{claim.title}</span>
                                            <span className="text-xs text-surface-on-variant">{claim.id} • {claim.classification}</span>
                                        </div>
                                    </div>
                                    <StatusBadge status={claim.status} />
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
  );
};

export default TaskList;