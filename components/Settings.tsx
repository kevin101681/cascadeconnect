import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Settings as SettingsIcon } from 'lucide-react';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type ResponseTemplate,
  type CreateTemplateData,
} from '../actions/templates';
import Button from './Button';

interface SettingsProps {
  onNavigate: (view: 'DASHBOARD') => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      alert('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openNewTemplateModal = () => {
    setEditingTemplate(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('General');
    setIsModalOpen(true);
  };

  const openEditTemplateModal = (template: ResponseTemplate) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormContent(template.content);
    setFormCategory(template.category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('General');
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      alert('Please fill in both title and content.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate) {
        // Update existing template
        await updateTemplate(editingTemplate.id, {
          title: formTitle,
          content: formContent,
          category: formCategory,
        });
      } else {
        // Create new template
        await createTemplate({
          title: formTitle,
          content: formContent,
          category: formCategory,
        });
      }

      await loadTemplates();
      closeModal();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await deleteTemplate(id);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, ResponseTemplate[]>);

  const categories = Object.keys(templatesByCategory).sort();

  return (
    <div className="flex-1 overflow-auto bg-surface dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('DASHBOARD')}
              className="text-sm text-primary hover:underline"
            >
              ← Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <SettingsIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-surface-on dark:text-gray-100">Settings</h1>
                <p className="text-sm text-surface-on-variant dark:text-gray-400">
                  Manage response templates for warranty claims
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="filled"
            onClick={openNewTemplateModal}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>

        {/* Templates List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-surface-outline-variant dark:border-gray-700 p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-surface-on-variant dark:text-gray-400">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-surface-on-variant dark:text-gray-400 mb-4">
                No templates yet. Create your first template to get started.
              </p>
              <Button variant="filled" onClick={openNewTemplateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {templatesByCategory[category].map((template) => (
                      <div
                        key={template.id}
                        className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary dark:hover:border-primary transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-surface-on dark:text-gray-100 mb-1">
                            {template.title}
                          </h4>
                          <p className="text-sm text-surface-on-variant dark:text-gray-400 line-clamp-2 whitespace-pre-wrap">
                            {template.content}
                          </p>
                          <p className="text-xs text-surface-on-variant dark:text-gray-500 mt-2">
                            Created: {template.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditTemplateModal(template)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit template"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id, template.title)}
                            className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal for Create/Edit Template */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-surface-outline-variant dark:border-gray-700">
            <div className="p-6 space-y-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-surface-on dark:text-gray-100">
                  {editingTemplate ? 'Edit Template' : 'New Template'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-surface-on-variant hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                    Template Title *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Non-Warranty: Cosmetic Issue"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-surface-on dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-surface-on dark:text-gray-100"
                  >
                    <option value="General">General</option>
                    <option value="Structural">Structural</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Exterior">Exterior</option>
                    <option value="Cosmetic">Cosmetic</option>
                    <option value="Non-Warranty">Non-Warranty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                    Template Content *
                  </label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Enter the full response text that will be inserted..."
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-surface-on dark:text-gray-100 resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="filled"
                  onClick={handleSave}
                  disabled={isSaving || !formTitle.trim() || !formContent.trim()}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

