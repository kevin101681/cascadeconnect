'use client';

/**
 * GUIDE EDITOR ADMIN PAGE
 * Admin interface for managing Homeowner Warranty Guide steps
 */

import React, { useState, useEffect } from 'react';
import {
  getAllGuideSteps,
  saveGuideStep,
  deleteGuideStep,
  reorderSteps,
  toggleStepActive,
} from '@/actions/guide-editor';
import type { GuideStep } from '@/db/schema';
import {
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { uploadFile } from '@/lib/services/uploadService';

export default function GuideEditorPage() {
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<GuideStep | null>(null);
  const [isNewStep, setIsNewStep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadSteps();
  }, []);

  const loadSteps = async () => {
    try {
      setLoading(true);
      const data = await getAllGuideSteps();
      setSteps(data);
    } catch (error) {
      console.error('Failed to load steps:', error);
      alert('Failed to load guide steps');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (step: GuideStep) => {
    setEditingStep(step);
    setIsNewStep(false);
    setFormTitle(step.title);
    setFormDescription(step.description);
    setFormImageUrl(step.imageUrl);
    setImagePreview(step.imageUrl);
  };

  const handleNew = () => {
    setEditingStep(null);
    setIsNewStep(true);
    setFormTitle('');
    setFormDescription('');
    setFormImageUrl('');
    setImagePreview('');
  };

  const handleCancel = () => {
    setEditingStep(null);
    setIsNewStep(false);
    setFormTitle('');
    setFormDescription('');
    setFormImageUrl('');
    setImagePreview('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);

      const result = await uploadFile(file, {
        maxFileSizeMB: 10,
        timeoutMs: 60000,
      });

      if (result.success && result.attachment) {
        setFormImageUrl(result.attachment.url);
        setImagePreview(result.attachment.url);
      } else {
        alert(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formDescription.trim() || !formImageUrl) {
      alert('Please fill in all fields and upload an image');
      return;
    }

    try {
      setIsSaving(true);

      await saveGuideStep({
        id: editingStep?.id,
        title: formTitle,
        description: formDescription,
        imageUrl: formImageUrl,
      });

      await loadSteps();
      handleCancel();
      alert(editingStep ? 'Step updated!' : 'Step created!');
    } catch (error) {
      console.error('Failed to save step:', error);
      alert('Failed to save step');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return;

    try {
      await deleteGuideStep(id);
      await loadSteps();
      alert('Step deleted!');
    } catch (error) {
      console.error('Failed to delete step:', error);
      alert('Failed to delete step');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await toggleStepActive(id, !currentStatus);
      await loadSteps();
    } catch (error) {
      console.error('Failed to toggle status:', error);
      alert('Failed to toggle status');
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSteps = [...steps];
    const draggedStep = newSteps[draggedIndex];
    newSteps.splice(draggedIndex, 1);
    newSteps.splice(index, 0, draggedStep);

    setSteps(newSteps);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    try {
      // Update sortOrder for all items
      const updates = steps.map((step, index) => ({
        id: step.id,
        sortOrder: String(index + 1).padStart(3, '0'),
      }));

      await reorderSteps(updates);
      setDraggedIndex(null);
    } catch (error) {
      console.error('Failed to reorder:', error);
      alert('Failed to save new order');
      await loadSteps();
    }
  };

  const moveStep = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];

    setSteps(newSteps);

    try {
      const updates = newSteps.map((step, idx) => ({
        id: step.id,
        sortOrder: String(idx + 1).padStart(3, '0'),
      }));

      await reorderSteps(updates);
    } catch (error) {
      console.error('Failed to reorder:', error);
      alert('Failed to save new order');
      await loadSteps();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Warranty Guide Editor
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage the steps shown in the Homeowner Warranty Guide
        </p>
      </div>

      {/* Add New Button */}
      {!editingStep && !isNewStep && (
        <button
          onClick={handleNew}
          className="mb-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Step
        </button>
      )}

      {/* Edit/Create Form */}
      {(editingStep || isNewStep) && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-500 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {isNewStep ? 'Create New Step' : 'Edit Step'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g., Start a Service Request"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe what the user should do in this step..."
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Screenshot/Image
              </label>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-700 flex items-center justify-center gap-2">
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Click to upload image
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="w-32 h-32 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving || uploadingImage}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Step
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`p-4 bg-white dark:bg-gray-800 rounded-lg border-2 ${
              step.isActive
                ? 'border-gray-200 dark:border-gray-700'
                : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'
            } hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-move`}
          >
            <div className="flex items-start gap-4">
              {/* Drag Handle */}
              <div className="mt-2">
                <GripVertical className="w-5 h-5 text-gray-400" />
              </div>

              {/* Step Number */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                {index + 1}
              </div>

              {/* Image Thumbnail */}
              <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <img
                  src={step.imageUrl}
                  alt={step.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {step.description}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Move Up/Down */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveStep(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveStep(index, 'down')}
                    disabled={index === steps.length - 1}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>

                {/* Toggle Active */}
                <button
                  onClick={() => handleToggleActive(step.id, step.isActive)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title={step.isActive ? 'Hide step' : 'Show step'}
                >
                  {step.isActive ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>

                {/* Edit */}
                <button
                  onClick={() => handleEdit(step)}
                  className="p-2 text-blue-500 hover:text-blue-600"
                  title="Edit step"
                >
                  <Edit2 className="w-5 h-5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(step.id)}
                  className="p-2 text-red-500 hover:text-red-600"
                  title="Delete step"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {steps.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No guide steps yet. Click "Add New Step" to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
