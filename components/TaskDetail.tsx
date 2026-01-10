import React, { useState, useEffect } from 'react';
import { Task, InternalEmployee, Claim, Homeowner, ClaimStatus } from '../types';
import Button from './Button';
import StatusBadge from './StatusBadge';
import { Check, Calendar, User, CheckSquare, Square, HardHat, Edit2, X, MessageSquare, Send, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { TaskMessage } from './MessageSummaryModal';
import { AutoSaveTextarea } from './ui/AutoSaveTextarea';
import { DropdownButton } from './ui/dropdown-button';

interface TaskDetailProps {
  task: Task;
  employees: InternalEmployee[];
  currentUser: InternalEmployee;
  claims: Claim[];
  homeowners?: Homeowner[];
  preSelectedHomeowner?: Homeowner | null;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onBack: () => void;
  onSelectClaim?: (claim: Claim) => void;
  startInEditMode?: boolean; // Optional prop to start in edit mode
  taskMessages?: TaskMessage[];
  onSendMessage?: (task: Task) => void;
  onTrackTaskMessage?: (taskId: string, messageData: {
    type: 'EMPLOYEE';
    threadId?: string;
    subject: string;
    recipient: string;
    recipientEmail: string;
    content: string;
    senderName: string;
  }) => void;
  onNavigate?: (view: 'DASHBOARD' | 'TEAM' | 'DATA' | 'TASKS' | 'INVOICES' | 'HOMEOWNERS' | 'EMAIL_HISTORY' | 'BACKEND' | 'CALLS', config?: { initialTab?: 'CLAIMS' | 'MESSAGES' | 'TASKS' | 'NOTES'; initialThreadId?: string | null }) => void;
  
  // Quick Actions for task creation
  onCreateScheduleTask?: (assigneeId: string) => Promise<void>;
  onCreateEvalTask?: (type: '60 Day' | '11 Month' | 'Other', assigneeId: string) => Promise<void>;
}

const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  employees,
  currentUser,
  claims,
  homeowners = [],
  preSelectedHomeowner,
  onUpdateTask,
  onDeleteTask,
  onToggleTask,
  onBack,
  onSelectClaim,
  startInEditMode = false,
  taskMessages = [],
  onSendMessage,
  onTrackTaskMessage,
  onNavigate,
  onCreateScheduleTask,
  onCreateEvalTask
}) => {
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [editTaskTitle, setEditTaskTitle] = useState(task.title);
  const [editTaskAssignee, setEditTaskAssignee] = useState(task.assignedToId);
  const [editSelectedClaimIds, setEditSelectedClaimIds] = useState<string[]>(task.relatedClaimIds || []);
  const [isMessageSummaryExpanded, setIsMessageSummaryExpanded] = useState(false);
  const [quickActionAssignee, setQuickActionAssignee] = useState<string>('');
  
  // Ensure taskMessages is always an array
  const safeTaskMessages = Array.isArray(taskMessages) ? taskMessages : [];

  useEffect(() => {
    setIsEditing(startInEditMode);
    setEditTaskTitle(task.title);
    setEditTaskAssignee(task.assignedToId);
    setEditSelectedClaimIds(task.relatedClaimIds || []);
  }, [task.id, startInEditMode]);

  const assignee = employees.find(e => e.id === task.assignedToId);
  const taskClaims = task.relatedClaimIds 
    ? claims.filter(c => task.relatedClaimIds?.includes(c.id))
    : [];

  // Get open claims for selected homeowner (only if context exists)
  const openClaims = preSelectedHomeowner 
    ? claims.filter(c => {
        const claimEmail = c.homeownerEmail?.toLowerCase().trim() || '';
        const homeownerEmail = preSelectedHomeowner.email?.toLowerCase().trim() || '';
        return claimEmail === homeownerEmail && c.status !== ClaimStatus.COMPLETED;
      })
    : [];
  
  // Use openClaims when editing if homeowner is selected, otherwise use all claims
  const availableClaims = isEditing && preSelectedHomeowner ? openClaims : claims;

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateTask) return;
    
    onUpdateTask(task.id, {
      title: editTaskTitle,
      assignedToId: editTaskAssignee,
      relatedClaimIds: editSelectedClaimIds
    });
    
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTaskTitle(task.title);
    setEditTaskAssignee(task.assignedToId);
    setEditSelectedClaimIds(task.relatedClaimIds || []);
    setIsEditing(false);
  };

  const toggleClaimSelection = (claimId: string) => {
    setEditSelectedClaimIds(prev => 
      prev.includes(claimId) 
        ? prev.filter(id => id !== claimId) 
        : [...prev, claimId]
    );
  };

  return (
    <div className="flex flex-col h-full relative max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex-1">
          {isEditing ? (
            <input 
              type="text" 
              value={editTaskTitle}
              onChange={e => setEditTaskTitle(e.target.value)}
              autoFocus
              className="text-2xl font-normal bg-surface-container dark:bg-gray-700 border border-primary rounded px-2 py-1 text-surface-on dark:text-gray-100 focus:outline-none w-full"
            />
          ) : (
            <div className="text-sm text-surface-on-variant dark:text-gray-400 flex items-center gap-2 whitespace-nowrap flex-wrap">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                Assigned to: <span className="font-medium text-surface-on dark:text-gray-100">{assignee?.name || 'Unknown'}</span>
              </span>
              <span className="text-surface-outline dark:text-gray-600">|</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Assigned: {task.dateAssigned ? new Date(task.dateAssigned).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isEditing && onUpdateTask && !task.isCompleted && (
            <Button
              variant="text"
              icon={<Edit2 className="h-4 w-4" />}
              onClick={() => setIsEditing(true)}
              className="!px-2"
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 pb-10">
        {/* Quick Actions (Task Creation) */}
        {(onCreateScheduleTask || onCreateEvalTask) && (
          <div className="bg-primary-container/10 dark:bg-primary/5 p-6 rounded-2xl border border-primary/20 dark:border-primary/30">
            <h3 className="text-sm font-semibold text-primary dark:text-primary-light mb-4 uppercase tracking-wide">Quick Actions</h3>
            
            {/* Assigned To Dropdown */}
            <label className="text-xs font-medium text-surface-on dark:text-gray-200 mb-2 block">Assign To</label>
            <select 
              value={quickActionAssignee}
              onChange={e => setQuickActionAssignee(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border border-surface-outline-variant dark:border-gray-600 mb-4"
            >
              <option value="">Select User...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
              ))}
            </select>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              {onCreateEvalTask && (
                <DropdownButton
                  label="Eval"
                  variant="outlined"
                  className="!h-10 !px-4 !min-w-0 flex-1"
                  disabled={!quickActionAssignee}
                  options={[
                    { 
                      label: '60 Day', 
                      onClick: () => { 
                        if (quickActionAssignee) {
                          void onCreateEvalTask('60 Day', quickActionAssignee);
                          setQuickActionAssignee(''); // Reset after creation
                        }
                      } 
                    },
                    { 
                      label: '11 Month', 
                      onClick: () => { 
                        if (quickActionAssignee) {
                          void onCreateEvalTask('11 Month', quickActionAssignee);
                          setQuickActionAssignee('');
                        }
                      } 
                    },
                    { 
                      label: 'Other', 
                      onClick: () => { 
                        if (quickActionAssignee) {
                          void onCreateEvalTask('Other', quickActionAssignee);
                          setQuickActionAssignee('');
                        }
                      } 
                    },
                  ]}
                />
              )}
              {onCreateScheduleTask && (
                <Button
                  variant="outlined"
                  onClick={async () => {
                    if (quickActionAssignee) {
                      await onCreateScheduleTask(quickActionAssignee);
                      setQuickActionAssignee(''); // Reset after creation
                    }
                  }}
                  disabled={!quickActionAssignee}
                  className="!h-10 !px-4 !min-w-0 flex-1"
                >
                  Schedule
                </Button>
              )}
            </div>
            
            {!quickActionAssignee && (
              <p className="mt-3 text-xs text-surface-on-variant dark:text-gray-400 italic">
                Select a user to enable task creation buttons
              </p>
            )}
          </div>
        )}

        {/* Assignee Editor (Edit Mode Only) */}
        {isEditing && (
          <div className="bg-surface-container dark:bg-gray-800 p-6 rounded-2xl border border-surface-outline-variant dark:border-gray-700">
            <label className="text-sm font-medium text-surface-on dark:text-gray-200 mb-2 block">Assigned To</label>
            <select 
              className="w-full bg-white dark:bg-white rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-900 border border-surface-outline-variant dark:border-gray-600"
              value={editTaskAssignee}
              onChange={e => setEditTaskAssignee(e.target.value)}
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div className="bg-surface-container dark:bg-gray-800 p-6 rounded-2xl border border-surface-outline-variant dark:border-gray-700">
          <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 mb-4">Notes</h3>
          {isEditing ? (
            <AutoSaveTextarea
              value={task.description || ''}
              onSave={async (newValue) => {
                if (onUpdateTask) {
                  await onUpdateTask(task.id, { description: newValue });
                }
              }}
              placeholder="Add notes for this task..."
              rows={6}
              showSaveStatus={true}
            />
          ) : (
            <div className="text-sm text-surface-on dark:text-gray-100 whitespace-pre-wrap">
              {task.description || <span className="text-surface-on-variant dark:text-gray-400 italic">No notes provided.</span>}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="bg-surface-container dark:bg-gray-800 p-6 rounded-2xl border border-surface-outline-variant dark:border-gray-700">
          <button
            onClick={() => setIsMessageSummaryExpanded(!isMessageSummaryExpanded)}
            className="w-full flex items-center justify-between mb-4 text-left"
          >
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Messages
            </h3>
            {isMessageSummaryExpanded ? (
              <ChevronUp className="h-5 w-5 text-surface-on dark:text-gray-100" />
            ) : (
              <ChevronDown className="h-5 w-5 text-surface-on dark:text-gray-100" />
            )}
          </button>
          
          {isMessageSummaryExpanded && (
            <div>
              {safeTaskMessages.length === 0 ? (
                <p className="text-sm text-surface-on-variant dark:text-gray-400 whitespace-pre-wrap leading-relaxed bg-surface/30 dark:bg-gray-700/30 rounded-lg p-4 border border-surface-outline-variant dark:border-gray-600">
                  No messages sent for this task yet. Messages sent via the "Send Message" button will appear here.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...safeTaskMessages].sort((a, b) => 
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                  ).map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-surface/30 dark:bg-gray-700/30 rounded-lg p-4 border border-surface-outline-variant dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-surface-on dark:text-gray-100">
                            To: {msg.recipient}
                          </span>
                        </div>
                        <span className="text-xs text-surface-on-variant dark:text-gray-400">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="mb-2">
                        <p className="text-xs font-medium text-surface-on-variant dark:text-gray-400 opacity-70 mb-1">Subject:</p>
                        <p className="text-sm text-surface-on dark:text-gray-100">{msg.subject}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-surface-on-variant dark:text-gray-400 opacity-70 mb-1">Message:</p>
                        <p className="text-sm text-surface-on dark:text-gray-100 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-surface-outline-variant dark:border-gray-600 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-surface-on-variant dark:text-gray-400 opacity-70">
                          Sent by: {msg.senderName} • To: {msg.recipientEmail}
                        </p>
                        {onNavigate && msg.threadId && (
                          <button
                            onClick={() => {
                              onNavigate('DASHBOARD', { initialTab: 'MESSAGES', initialThreadId: msg.threadId || null });
                            }}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/10 dark:hover:bg-primary/20"
                            title="View in Message Center"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View in Messages
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Send Message Button - Moved to bottom */}
              {!isEditing && onSendMessage && (
                <div className="mt-4 pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                  <Button 
                    variant="tonal" 
                    onClick={() => onSendMessage(task)} 
                    icon={<MessageSquare className="h-4 w-4" />}
                    className="w-full"
                  >
                    Send Message
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Related Claims */}
        <div className="bg-surface-container dark:bg-gray-800 p-6 rounded-2xl border border-surface-outline-variant dark:border-gray-700">
          <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Subs to Schedule
          </h3>
          {isEditing ? (
            <div className="space-y-2">
              {availableClaims.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {availableClaims.map(claim => {
                    const isSelected = editSelectedClaimIds.includes(claim.id);
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
                  No claims available.
                </div>
              )}
            </div>
          ) : taskClaims.length > 0 ? (
            <div className="space-y-2">
              {taskClaims.map(claim => (
                <div 
                  key={claim.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-surface-outline-variant dark:border-gray-600 bg-surface dark:bg-gray-700 text-sm cursor-pointer hover:bg-surface-container-high dark:hover:bg-gray-600 transition-colors"
                  onClick={() => onSelectClaim?.(claim)}
                >
                  <div className="flex items-center gap-3">
                    <Square className="h-4 w-4 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-medium text-surface-on dark:text-gray-100 block">{claim.title}</span>
                      <div className="flex items-center flex-wrap gap-1 text-xs text-surface-on-variant dark:text-gray-400">
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
          ) : (
            <div className="text-sm text-surface-on-variant dark:text-gray-400 italic">
              No claims linked to this task.
            </div>
          )}
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex justify-end gap-2">
            <Button variant="text" onClick={handleCancelEdit}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Task Details</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetail;

