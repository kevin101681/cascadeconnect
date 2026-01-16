import React, { useState } from 'react';
import { Building2, Plus, Edit2, Trash2, X, Copy, Link as LinkIcon, CheckCircle } from 'lucide-react';
import Button from './Button';
import { BuilderGroup } from '../types';

interface BuilderManagementProps {
  builderGroups: BuilderGroup[];
  onAddBuilderGroup: (group: BuilderGroup) => void;
  onUpdateBuilderGroup: (group: BuilderGroup) => void;
  onDeleteBuilderGroup: (id: string) => void;
  onClose: () => void;
}

const BuilderManagement: React.FC<BuilderManagementProps> = ({
  builderGroups,
  onAddBuilderGroup,
  onUpdateBuilderGroup,
  onDeleteBuilderGroup,
  onClose,
}) => {
  const [selectedBuilder, setSelectedBuilder] = useState<BuilderGroup | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentSlug, setEnrollmentSlug] = useState('');

  const handleSelectBuilder = (builder: BuilderGroup) => {
    setSelectedBuilder(builder);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedBuilder(null);
    setName('');
    setEmail('');
    setEnrollmentSlug('');
  };

  const handleEdit = () => {
    if (!selectedBuilder) return;
    setIsEditing(true);
    setName(selectedBuilder.name);
    setEmail(selectedBuilder.email || '');
    setEnrollmentSlug(selectedBuilder.enrollmentSlug || '');
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Builder name is required');
      return;
    }

    const builderData: BuilderGroup = {
      id: selectedBuilder?.id || crypto.randomUUID(),
      name: name.trim(),
      email: email.trim() || undefined,
      enrollmentSlug: enrollmentSlug.trim() || undefined,
    };

    if (isCreating) {
      onAddBuilderGroup(builderData);
      setSelectedBuilder(builderData);
      setIsCreating(false);
    } else if (isEditing && selectedBuilder) {
      onUpdateBuilderGroup({ ...selectedBuilder, ...builderData });
      setSelectedBuilder({ ...selectedBuilder, ...builderData });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    if (selectedBuilder) {
      setName(selectedBuilder.name);
      setEmail(selectedBuilder.email || '');
      setEnrollmentSlug(selectedBuilder.enrollmentSlug || '');
    }
  };

  const handleDelete = () => {
    if (!selectedBuilder) return;
    if (confirm(`Are you sure you want to delete ${selectedBuilder.name}?`)) {
      onDeleteBuilderGroup(selectedBuilder.id);
      setSelectedBuilder(null);
    }
  };

  const generateSlug = () => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Check for duplicates and append number if needed
    let finalSlug = slug;
    let counter = 1;
    while (builderGroups.some(b => b.enrollmentSlug === finalSlug && b.id !== selectedBuilder?.id)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }
    
    setEnrollmentSlug(finalSlug);
  };

  const copyEnrollmentLink = () => {
    if (!selectedBuilder?.enrollmentSlug) return;
    const link = `${window.location.origin}/enroll/${selectedBuilder.enrollmentSlug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBulkGenerateLinks = async () => {
    const buildersWithoutSlugs = builderGroups.filter(b => !b.enrollmentSlug);
    
    if (buildersWithoutSlugs.length === 0) {
      alert('All builders already have enrollment links!');
      return;
    }

    if (!confirm(`Generate enrollment links for ${buildersWithoutSlugs.length} builders?`)) {
      return;
    }

    setIsGeneratingBulk(true);

    try {
      for (const builder of buildersWithoutSlugs) {
        // Generate slug from name
        const slug = builder.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        // Check for duplicates and append number if needed
        let finalSlug = slug;
        let counter = 1;
        while (builderGroups.some(b => b.enrollmentSlug === finalSlug && b.id !== builder.id)) {
          finalSlug = `${slug}-${counter}`;
          counter++;
        }
        
        // Update the builder with the new slug
        const updatedBuilder = { ...builder, enrollmentSlug: finalSlug };
        await onUpdateBuilderGroup(updatedBuilder);
      }

      alert(`Successfully generated ${buildersWithoutSlugs.length} enrollment links!`);
    } catch (error) {
      console.error('Bulk generation error:', error);
      alert('Failed to generate some links. Please try again.');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const inputClass = "w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none";
  const labelClass = "block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1";

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-surface dark:bg-gray-800 w-full max-w-7xl rounded-3xl shadow-elevation-3 overflow-hidden h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Builder Management
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">Manage builders and enrollment links</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Split Pane Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Builder List */}
          <aside className="w-1/3 border-r border-surface-outline-variant dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-surface-outline-variant dark:border-gray-700 space-y-2">
              <Button onClick={handleCreateNew} icon={<Plus className="h-4 w-4" />} className="w-full">
                Add Builder
              </Button>
              {builderGroups.some(b => !b.enrollmentSlug) && (
                <Button 
                  onClick={handleBulkGenerateLinks} 
                  icon={<LinkIcon className="h-4 w-4" />} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={isGeneratingBulk}
                >
                  {isGeneratingBulk ? 'Generating...' : 'Generate Missing Links'}
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {builderGroups.map(builder => (
                <button
                  key={builder.id}
                  onClick={() => handleSelectBuilder(builder)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedBuilder?.id === builder.id
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-surface-container dark:bg-gray-700/50 border-surface-outline-variant dark:border-gray-700 hover:bg-surface-container-high dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{builder.name}</h4>
                      {builder.email && (
                        <p className="text-xs text-surface-on-variant dark:text-gray-400 truncate mt-1">{builder.email}</p>
                      )}
                      {builder.enrollmentSlug && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          Link enabled
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Right Pane: Builder Detail */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {(selectedBuilder || isCreating) ? (
              <>
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                  {/* Builder Info Card */}
                  <div className="bg-surface-container dark:bg-gray-700/50 rounded-xl p-6 border border-surface-outline-variant dark:border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-base font-semibold text-surface-on dark:text-gray-100">
                        {isCreating ? 'New Builder' : isEditing ? 'Edit Builder' : 'Builder Details'}
                      </h4>
                      {!isCreating && !isEditing && selectedBuilder && (
                        <div className="flex gap-2">
                          <Button onClick={handleEdit} variant="text" icon={<Edit2 className="h-4 w-4" />}>
                            Edit
                          </Button>
                          <Button onClick={handleDelete} variant="text" icon={<Trash2 className="h-4 w-4" />} className="text-red-600 hover:text-red-700">
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>

                    {(isEditing || isCreating) ? (
                      <div className="space-y-4">
                        <div>
                          <label className={labelClass}>Builder Name *</label>
                          <input
                            type="text"
                            required
                            className={inputClass}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g., Acme Construction"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Email (Optional)</label>
                          <input
                            type="email"
                            className={inputClass}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="contact@builder.com"
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={handleSave} variant="filled">
                            {isCreating ? 'Create' : 'Save'}
                          </Button>
                          <Button onClick={handleCancel} variant="text">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Name</p>
                          <p className="text-sm text-surface-on dark:text-gray-100 font-medium">{selectedBuilder?.name}</p>
                        </div>
                        {selectedBuilder?.email && (
                          <div>
                            <p className="text-xs text-surface-on-variant dark:text-gray-400 mb-1">Email</p>
                            <p className="text-sm text-surface-on dark:text-gray-100">{selectedBuilder.email}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Enrollment Link Card */}
                  {!isCreating && selectedBuilder && (
                    <div className="bg-surface-container dark:bg-gray-700/50 rounded-xl p-6 border border-surface-outline-variant dark:border-gray-700">
                      <h4 className="text-base font-semibold text-surface-on dark:text-gray-100 mb-4 flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-primary" />
                        Enrollment Link
                      </h4>

                      {selectedBuilder.enrollmentSlug ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-surface-on-variant dark:text-gray-400 mb-2">Public URL</p>
                            <div className="bg-surface-container-high dark:bg-gray-800 rounded-lg p-3 font-mono text-xs text-surface-on dark:text-gray-100 break-all border border-surface-outline-variant dark:border-gray-600">
                              {window.location.origin}/enroll/{selectedBuilder.enrollmentSlug}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={copyEnrollmentLink} 
                              icon={copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              variant="filled"
                              className={copied ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              {copied ? 'Copied!' : 'Copy Link'}
                            </Button>
                            <Button onClick={handleEdit} variant="text">
                              Edit Slug
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-surface-on-variant dark:text-gray-400">
                            No enrollment link generated yet. Create a custom URL slug to enable public enrollment.
                          </p>
                          {isEditing ? (
                            <div>
                              <label className={labelClass}>URL Slug</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  className={inputClass}
                                  value={enrollmentSlug}
                                  onChange={e => setEnrollmentSlug(e.target.value)}
                                  placeholder="acme-construction"
                                />
                                <Button onClick={generateSlug} variant="text">
                                  Auto-Generate
                                </Button>
                              </div>
                              <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-2">
                                Preview: {window.location.origin}/enroll/{enrollmentSlug || 'your-slug'}
                              </p>
                            </div>
                          ) : (
                            <Button onClick={handleEdit} icon={<Plus className="h-4 w-4" />}>
                              Generate Link
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-center">
                <div>
                  <Building2 className="h-16 w-16 text-surface-outline-variant dark:text-gray-600 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-surface-on dark:text-gray-100 mb-2">
                    Select a Builder
                  </h4>
                  <p className="text-sm text-surface-on-variant dark:text-gray-400">
                    Choose a builder from the list or create a new one
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuilderManagement;
