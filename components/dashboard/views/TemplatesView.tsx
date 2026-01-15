/**
 * Templates View - Full Implementation
 * 
 * Manages response templates for messaging.
 * Extracted from Settings.tsx modal component.
 */

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Plus, Edit2, Trash2, Save, FileText, Search, X } from 'lucide-react';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type ResponseTemplate,
  type CreateTemplateData,
} from '../../../actions/templates';
import Button from '../../Button';

const TemplatesView: React.FC = () => {
  const { user } = useUser();
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadTemplates();
    }
  }, [user?.id]);

  const loadTemplates = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await getTemplates(user.id);
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
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    if (!formTitle.trim() || !formContent.trim()) {
      alert('Please fill in both title and content.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate) {
        await updateTemplate(user.id, editingTemplate.id, {
          title: formTitle,
          content: formContent,
          category: formCategory,
        });
      } else {
        await createTemplate(user.id, {
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

  const handleDelete = async (templateId: string) => {
    if (!user?.id) return;
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteTemplate(user.id, templateId);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700/50 flex-shrink-0 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100">
              Response Templates
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
              Create and manage templates for quick responses
            </p>
          </div>
          <Button onClick={openNewTemplateModal} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-surface-on-variant dark:text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 bg-surface dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 placeholder-surface-on-variant dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="h-16 w-16 mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-2">
              {searchQuery ? 'No templates found' : 'No templates yet'}
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first template to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={openNewTemplateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-surface dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-surface-on dark:text-gray-100 truncate">
                      {template.title}
                    </h4>
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                      {template.category}
                    </span>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => openEditTemplateModal(template)}
                      className="p-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-surface-on-variant dark:text-gray-400 line-clamp-3">
                  {template.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-elevation-3 overflow-hidden">
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center">
              <h4 className="text-lg font-semibold text-surface-on dark:text-gray-100">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h4>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Welcome Message"
                  className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 placeholder-surface-on-variant dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="General">General</option>
                  <option value="Claims">Claims</option>
                  <option value="Scheduling">Scheduling</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                  Content *
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Enter your template content..."
                  rows={8}
                  className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 placeholder-surface-on-variant dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Update' : 'Create'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesView;
