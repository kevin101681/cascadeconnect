import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Plus, Edit2, Trash2, X, Save, LayoutTemplate } from 'lucide-react';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type ResponseTemplate,
  type CreateTemplateData,
} from '../../actions/templates';
import Button from '../Button';
import { Dialog, DialogContent, DialogClose } from '../ui/dialog';

interface TemplatesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'warranty' | 'messages';
  prefillData?: {
    subject?: string;
    body?: string;
  };
}

const TemplatesManagerModal: React.FC<TemplatesManagerModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'warranty',
  prefillData 
}) => {
  const { user } = useUser();
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'warranty' | 'messages'>(initialTab);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [isSaving, setIsSaving] = useState(false);

  // Message templates state (localStorage-based)
  interface MessageEmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
  }
  const [messageTemplates, setMessageTemplates] = useState<MessageEmailTemplate[]>([]);
  const [isMessageTemplateModalOpen, setIsMessageTemplateModalOpen] = useState(false);
  const [editingMessageTemplate, setEditingMessageTemplate] = useState<MessageEmailTemplate | null>(null);
  const [messageFormName, setMessageFormName] = useState('');
  const [messageFormSubject, setMessageFormSubject] = useState('');
  const [messageFormBody, setMessageFormBody] = useState('');

  // Set initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Load warranty templates from database
  useEffect(() => {
    if (user?.id && isOpen) {
      loadTemplates();
    }
  }, [user?.id, isOpen]);

  // Load message templates from localStorage
  useEffect(() => {
    if (isOpen) {
      loadMessageTemplates();
    }
  }, [isOpen]);

  // Handle prefill data when "Save as Template" is clicked
  useEffect(() => {
    if (isOpen && prefillData && activeTab === 'messages') {
      setMessageFormSubject(prefillData.subject || '');
      setMessageFormBody(prefillData.body || '');
      // Auto-open the create modal if prefill data exists
      if (prefillData.subject || prefillData.body) {
        setIsMessageTemplateModalOpen(true);
      }
    }
  }, [isOpen, prefillData, activeTab]);

  useEffect(() => {
    if (user?.id && isOpen) {
      loadTemplates();
    }
  }, [user?.id, isOpen]);

  // Load message templates from localStorage
  useEffect(() => {
    if (isOpen) {
      loadMessageTemplates();
    }
  }, [isOpen]);

  // Handle prefill data when "Save as Template" is clicked
  useEffect(() => {
    if (isOpen && prefillData && activeTab === 'messages') {
      setMessageFormSubject(prefillData.subject || '');
      setMessageFormBody(prefillData.body || '');
      // Auto-open the create modal if prefill data exists
      if (prefillData.subject || prefillData.body) {
        setIsMessageTemplateModalOpen(true);
      }
    }
  }, [isOpen, prefillData, activeTab]);

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

  // Message template functions (localStorage)
  const loadMessageTemplates = () => {
    try {
      const saved = localStorage.getItem('cascade_message_templates');
      if (saved) {
        setMessageTemplates(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load message templates:', error);
    }
  };

  const saveMessageTemplates = (templates: MessageEmailTemplate[]) => {
    try {
      localStorage.setItem('cascade_message_templates', JSON.stringify(templates));
      setMessageTemplates(templates);
    } catch (error) {
      console.error('Failed to save message templates:', error);
      alert('Failed to save message templates. Please try again.');
    }
  };

  const openNewMessageTemplateModal = () => {
    setEditingMessageTemplate(null);
    setMessageFormName('');
    // Keep prefilled data if it exists
    if (!prefillData?.subject && !prefillData?.body) {
      setMessageFormSubject('');
      setMessageFormBody('');
    }
    setIsMessageTemplateModalOpen(true);
  };

  const openEditMessageTemplateModal = (template: MessageEmailTemplate) => {
    setEditingMessageTemplate(template);
    setMessageFormName(template.name);
    setMessageFormSubject(template.subject);
    setMessageFormBody(template.body);
    setIsMessageTemplateModalOpen(true);
  };

  const closeMessageTemplateModal = () => {
    setIsMessageTemplateModalOpen(false);
    setEditingMessageTemplate(null);
    setMessageFormName('');
    setMessageFormSubject('');
    setMessageFormBody('');
  };

  const handleSaveMessageTemplate = () => {
    if (!messageFormName.trim() || !messageFormSubject.trim() || !messageFormBody.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    if (editingMessageTemplate) {
      // Update existing
      const updated = messageTemplates.map(t => 
        t.id === editingMessageTemplate.id 
          ? { ...t, name: messageFormName, subject: messageFormSubject, body: messageFormBody }
          : t
      );
      saveMessageTemplates(updated);
    } else {
      // Create new
      const newTemplate: MessageEmailTemplate = {
        id: Date.now().toString(),
        name: messageFormName,
        subject: messageFormSubject,
        body: messageFormBody,
      };
      saveMessageTemplates([...messageTemplates, newTemplate]);
    }

    closeMessageTemplateModal();
  };

  const handleDeleteMessageTemplate = (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    const updated = messageTemplates.filter(t => t.id !== id);
    saveMessageTemplates(updated);
  };

  const openNewTemplateModal = () => {
    setEditingTemplate(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('General');
    setIsTemplateModalOpen(true);
  };

  const openEditTemplateModal = (template: ResponseTemplate) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormContent(template.content);
    setFormCategory(template.category);
    setIsTemplateModalOpen(true);
  };

  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
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
        // Update existing template
        await updateTemplate(user.id, editingTemplate.id, {
          title: formTitle,
          content: formContent,
          category: formCategory,
        });
      } else {
        // Create new template
        await createTemplate(user.id, {
          title: formTitle,
          content: formContent,
          category: formCategory,
        });
      }

      await loadTemplates();
      closeTemplateModal();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await deleteTemplate(user.id, id);
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

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <LayoutTemplate className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-surface-on dark:text-gray-100">
                  Manage Templates
                </h2>
                <p className="text-sm text-surface-on-variant dark:text-gray-400">
                  Create and manage response templates
                </p>
              </div>
            </div>
            <DialogClose onClose={onClose} />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 flex-shrink-0">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('warranty')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'warranty'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100'
                }`}
              >
                Warranty
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'messages'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100'
                }`}
              >
                Messages
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {activeTab === 'warranty' && (
              <div className="space-y-4">
                {/* Add New Template Button */}
                <div className="flex justify-end">
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
                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-surface-on-variant dark:text-gray-400">Loading templates...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
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
                                  Created: {template.createdAt?.toLocaleDateString() ?? 'Unknown'}
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
            )}

            {activeTab === 'messages' && (
              <div className="space-y-4">
                {/* Add New Template Button */}
                <div className="flex justify-end">
                  <Button
                    variant="filled"
                    onClick={openNewMessageTemplateModal}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Message Template
                  </Button>
                </div>

                {/* Message Templates List */}
                {messageTemplates.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <p className="text-surface-on-variant dark:text-gray-400 mb-4">
                      No message templates yet. Create your first template to get started.
                    </p>
                    <Button variant="filled" onClick={openNewMessageTemplateModal}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Message Template
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messageTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary dark:hover:border-primary transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-surface-on dark:text-gray-100 mb-1">
                            {template.name}
                          </h4>
                          <p className="text-sm font-medium text-surface-on-variant dark:text-gray-400 mb-1">
                            Subject: {template.subject}
                          </p>
                          <p className="text-sm text-surface-on-variant dark:text-gray-400 line-clamp-2 whitespace-pre-wrap">
                            {template.body}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditMessageTemplateModal(template)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit template"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessageTemplate(template.id)}
                            className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Create/Edit Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-surface-outline-variant dark:border-gray-700">
            <div className="p-6 space-y-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-surface-on dark:text-gray-100">
                  {editingTemplate ? 'Edit Template' : 'New Template'}
                </h2>
                <button
                  onClick={closeTemplateModal}
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
                  onClick={closeTemplateModal}
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

      {/* Message Template Create/Edit Modal */}
      {isMessageTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-surface-outline-variant dark:border-gray-700">
            <div className="p-6 space-y-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-surface-on dark:text-gray-100">
                  {editingMessageTemplate ? 'Edit Message Template' : 'New Message Template'}
                </h2>
                <button
                  onClick={closeMessageTemplateModal}
                  className="p-2 text-surface-on-variant hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={messageFormName}
                    onChange={(e) => setMessageFormName(e.target.value)}
                    placeholder="e.g., Welcome Email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-surface-on dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={messageFormSubject}
                    onChange={(e) => setMessageFormSubject(e.target.value)}
                    placeholder="e.g., Welcome to Cascade Connect"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-surface-on dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-300 mb-2">
                    Message Body *
                  </label>
                  <textarea
                    value={messageFormBody}
                    onChange={(e) => setMessageFormBody(e.target.value)}
                    placeholder="Enter the full message text..."
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-surface-on dark:text-gray-100 resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={closeMessageTemplateModal}
                >
                  Cancel
                </Button>
                <Button
                  variant="filled"
                  onClick={handleSaveMessageTemplate}
                  disabled={!messageFormName.trim() || !messageFormSubject.trim() || !messageFormBody.trim()}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TemplatesManagerModal;
