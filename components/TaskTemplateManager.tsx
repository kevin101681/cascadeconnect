/**
 * Task Template Manager Component
 * 
 * Allows users to create, edit, and use reusable task title templates
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, FileText } from 'lucide-react';
import Button from './Button';

export interface TaskTemplate {
  id: string;
  name: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskTemplateManagerProps {
  onSelectTemplate: (template: TaskTemplate) => void;
  onClose?: () => void;
}

const TaskTemplateManager: React.FC<TaskTemplateManagerProps> = ({ onSelectTemplate, onClose }) => {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Load templates from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('task_templates');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTemplates(parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt)
        })));
      } catch (e) {
        console.error('Error loading templates:', e);
      }
    }
  }, []);

  // Save templates to localStorage
  const saveTemplates = (newTemplates: TaskTemplate[]) => {
    localStorage.setItem('task_templates', JSON.stringify(newTemplates));
    setTemplates(newTemplates);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setTemplateName('');
    setTemplateTitle('');
    setTemplateDescription('');
  };

  const handleSave = () => {
    if (!templateName.trim() || !templateTitle.trim()) {
      alert('Template name and title are required');
      return;
    }

    if (editingId) {
      // Update existing template
      const updated = templates.map(t =>
        t.id === editingId
          ? {
              ...t,
              name: templateName,
              title: templateTitle,
              description: templateDescription,
              updatedAt: new Date()
            }
          : t
      );
      saveTemplates(updated);
      setEditingId(null);
    } else {
      // Create new template
      const newTemplate: TaskTemplate = {
        id: crypto.randomUUID(),
        name: templateName,
        title: templateTitle,
        description: templateDescription,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      saveTemplates([...templates, newTemplate]);
      setIsCreating(false);
    }

    // Reset form
    setTemplateName('');
    setTemplateTitle('');
    setTemplateDescription('');
  };

  const handleEdit = (template: TaskTemplate) => {
    setEditingId(template.id);
    setTemplateName(template.name);
    setTemplateTitle(template.title);
    setTemplateDescription(template.description || '');
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this template?')) {
      saveTemplates(templates.filter(t => t.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setTemplateName('');
        setTemplateTitle('');
        setTemplateDescription('');
      }
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setTemplateName('');
    setTemplateTitle('');
    setTemplateDescription('');
  };

  const handleUseTemplate = (template: TaskTemplate) => {
    onSelectTemplate(template);
    if (onClose) onClose();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-surface-on dark:text-gray-100 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Task Templates
        </h3>
        <Button
          onClick={handleCreate}
          variant="filled"
          icon={<Plus className="h-3 w-3" />}
          className="!h-8 !px-3 text-xs"
          disabled={isCreating || editingId !== null}
        >
          New Template
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600 space-y-3">
          <div>
            <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">
              Template Name
            </label>
            <input
              type="text"
              className="w-full bg-surface dark:bg-gray-800 border border-surface-outline-variant dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 focus:border-primary focus:outline-none"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g., Follow up with homeowner"
            />
          </div>

          <div>
            <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">
              Task Title Template
            </label>
            <input
              type="text"
              className="w-full bg-surface dark:bg-gray-800 border border-surface-outline-variant dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 focus:border-primary focus:outline-none"
              value={templateTitle}
              onChange={e => setTemplateTitle(e.target.value)}
              placeholder="e.g., Follow up with {homeownerName} about {claimTitle}"
            />
            <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
              Use {'{homeownerName}'}, {'{claimTitle}'}, {'{date}'} as placeholders
            </p>
          </div>

          <div>
            <label className="text-xs text-surface-on-variant dark:text-gray-400 mb-1 block">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full bg-surface dark:bg-gray-800 border border-surface-outline-variant dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 focus:border-primary focus:outline-none resize-none"
              value={templateDescription}
              onChange={e => setTemplateDescription(e.target.value)}
              placeholder="Default description for tasks using this template"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="text" onClick={handleCancel} className="!h-8 !px-3 text-xs">
              Cancel
            </Button>
            <Button onClick={handleSave} className="!h-8 !px-3 text-xs">
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {templates.length === 0 && !isCreating && (
          <div className="text-center py-6 text-surface-on-variant dark:text-gray-400 text-sm bg-surface-container/30 dark:bg-gray-700/30 rounded-xl border border-dashed border-surface-outline-variant dark:border-gray-600">
            No templates yet. Create one to get started.
          </div>
        )}

        {templates.map(template => (
          <div
            key={template.id}
            className={`bg-surface-container dark:bg-gray-800 rounded-xl p-3 border border-surface-outline-variant dark:border-gray-600 ${
              editingId === template.id ? 'ring-2 ring-primary' : ''
            }`}
          >
            {editingId === template.id ? (
              // Edit mode - form is shown above
              <div className="text-xs text-surface-on-variant dark:text-gray-400">
                Editing...
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-surface-on dark:text-gray-100 mb-1">
                      {template.name}
                    </div>
                    <div className="text-xs text-surface-on-variant dark:text-gray-400 font-mono bg-surface dark:bg-gray-700 px-2 py-1 rounded">
                      {template.title}
                    </div>
                    {template.description && (
                      <div className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                        {template.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Use Template"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-1.5 text-surface-on-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit Template"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskTemplateManager;

