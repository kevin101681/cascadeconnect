/**
 * BuilderForm Component
 * 
 * A reusable form for creating/editing builders.
 * Used in the right pane of the split-view Invoices page.
 */

import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Trash2 } from 'lucide-react';

interface BuilderFormProps {
  mode: 'create' | 'edit';
  initialData: Client | null;
  clients: Client[]; // For validation (duplicate checking)
  onSave: (client: Client) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

export const BuilderForm: React.FC<BuilderFormProps> = ({
  mode,
  initialData,
  clients,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<Client>>({
    companyName: initialData?.companyName || '',
    email: initialData?.email || '',
    addressLine1: initialData?.addressLine1 || '',
    addressLine2: initialData?.addressLine2 || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zip: initialData?.zip || '',
    checkPayorName: initialData?.checkPayorName || '',
  });

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({
      companyName: initialData?.companyName || '',
      email: initialData?.email || '',
      addressLine1: initialData?.addressLine1 || '',
      addressLine2: initialData?.addressLine2 || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      zip: initialData?.zip || '',
      checkPayorName: initialData?.checkPayorName || '',
    });
  }, [initialData?.id]);

  const handleSave = () => {
    // Validation
    if (!formData.companyName?.trim()) {
      alert('Builder Name is required');
      return;
    }
    if (!formData.email?.trim()) {
      alert('Email is required');
      return;
    }

    // Construct the client data
    const clientData: Client = {
      id: initialData?.id || crypto.randomUUID(),
      companyName: formData.companyName.trim(),
      checkPayorName: formData.checkPayorName?.trim() || '',
      email: formData.email.trim(),
      addressLine1: formData.addressLine1?.trim() || '',
      addressLine2: formData.addressLine2?.trim() || '',
      city: formData.city?.trim() || '',
      state: formData.state?.trim() || '',
      zip: formData.zip?.trim() || '',
      address: initialData?.address, // Preserve existing address field if present
    };

    onSave(clientData);
  };

  const handleDelete = () => {
    if (!initialData?.id || !onDelete) return;
    onDelete(initialData.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-surface-on dark:text-gray-100">
          {mode === 'create' ? 'New Builder' : 'Edit Builder'}
        </h2>
        {mode === 'edit' && onDelete && (
          <Button
            variant="outline"
            onClick={handleDelete}
            className="!text-red-600 !border-red-300 hover:!bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Builder
          </Button>
        )}
      </div>

      {/* Form */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Builder Name - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">
              Builder Name *
            </label>
            <input
              type="text"
              value={formData.companyName || ''}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full bg-white dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100"
              placeholder="Enter builder/company name"
            />
          </div>

          {/* Email - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-white dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100"
              placeholder="contact@builder.com"
            />
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">
              Address Line 1
            </label>
            <input
              type="text"
              value={formData.addressLine1 || ''}
              onChange={e => setFormData({ ...formData, addressLine1: e.target.value })}
              className="w-full bg-white dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100"
              placeholder="Street address"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.addressLine2 || ''}
              onChange={e => setFormData({ ...formData, addressLine2: e.target.value })}
              className="w-full bg-white dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100"
              placeholder="Suite, unit, etc."
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">
              City
            </label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              className="w-full bg-white dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100"
              placeholder="City"
            />
          </div>

          {/* State and Zip */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state || ''}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="w-full bg-white dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100"
                placeholder="WA"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">
                Zip
              </label>
              <input
                type="text"
                value={formData.zip || ''}
                onChange={e => setFormData({ ...formData, zip: e.target.value })}
                className="w-full bg-white dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100"
                placeholder="98001"
              />
            </div>
          </div>

          {/* Check Payor Name - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">
              Name on Check (Optional)
            </label>
            <input
              type="text"
              value={formData.checkPayorName || ''}
              onChange={e => setFormData({ ...formData, checkPayorName: e.target.value })}
              className="w-full bg-white dark:bg-gray-700 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary text-surface-on dark:text-gray-100"
              placeholder="If different from Builder Name"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {mode === 'create' ? 'Save Builder' : 'Update Builder'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
