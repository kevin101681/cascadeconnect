'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { getTemplates, type ResponseTemplate } from '@/actions/templates';

interface NonWarrantyInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}

export function NonWarrantyInput({
  value,
  onChange,
  disabled = false,
  placeholder = 'Enter internal notes...',
  rows = 4,
}: NonWarrantyInputProps) {
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (!templateId) return;

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    // If textarea is empty, replace with template content
    // Otherwise, append with double newline separator
    const newValue = value.trim()
      ? `${value}\n\n${template.content}`
      : template.content;

    onChange(newValue);
    
    // Reset select after insertion
    setTimeout(() => setSelectedTemplateId(''), 100);
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
    <div className="space-y-3">
      {/* Template Selector */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          <Sparkles className="w-4 h-4 text-primary" />
          Quick Insert:
        </label>
        <select
          value={selectedTemplateId}
          onChange={(e) => handleTemplateSelect(e.target.value)}
          disabled={disabled || loading}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {loading ? 'Loading templates...' : 'Select a template...'}
          </option>
          {categories.map((category) => (
            <optgroup key={category} label={category}>
              {templatesByCategory[category].map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onInput={(e) => {
          const target = e.currentTarget;
          target.style.height = 'auto';
          target.style.height = target.scrollHeight + 'px';
        }}
        disabled={disabled}
        placeholder={placeholder}
        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 px-3 py-3 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:text-sm transition-colors resize-none overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px]"
      />

      {/* Helper Text */}
      {templates.length === 0 && !loading && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No templates available. Create templates in Settings → Templates.
        </p>
      )}
    </div>
  );
}

