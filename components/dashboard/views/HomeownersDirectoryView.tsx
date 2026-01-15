/**
 * Homeowners Directory View - Full Implementation
 * 
 * Complete homeowner management with search, filter, edit, and delete.
 * Extracted from HomeownersList.tsx modal component.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Homeowner, BuilderGroup, BuilderUser } from '../../../types';
import Button from '../../Button';
import MaterialSelect from '../../MaterialSelect';
import { Edit2, Trash2, X, Search, Building2, MapPin, Phone, Mail, Calendar, Filter, Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface HomeownersDirectoryViewProps {
  homeowners: Homeowner[];
  builderGroups: BuilderGroup[];
  builderUsers: BuilderUser[];
  onUpdateHomeowner: (homeowner: Homeowner) => void;
  onDeleteHomeowner: (id: string) => void;
}

const HomeownersDirectoryView: React.FC<HomeownersDirectoryViewProps> = ({
  homeowners,
  builderGroups,
  builderUsers,
  onUpdateHomeowner,
  onDeleteHomeowner
}) => {
  const PAGE_SIZE = 50;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilderId, setSelectedBuilderId] = useState<string>('all');
  const [editingHomeowner, setEditingHomeowner] = useState<Homeowner | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editZip, setEditZip] = useState('');
  const [editBuilderId, setEditBuilderId] = useState('');
  const [editJobName, setEditJobName] = useState('');
  const [editClosingDate, setEditClosingDate] = useState('');

  // Filter and search homeowners
  const filteredHomeowners = useMemo(() => {
    let filtered = homeowners;

    if (selectedBuilderId !== 'all') {
      filtered = filtered.filter(h => h.builderUserId === selectedBuilderId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h =>
        (h.name || "").toLowerCase().includes(query) ||
        (h.email || "").toLowerCase().includes(query) ||
        (h.address || "").toLowerCase().includes(query) ||
        (h.jobName || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [homeowners, selectedBuilderId, searchQuery]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, selectedBuilderId]);

  const pageCount = Math.max(1, Math.ceil(filteredHomeowners.length / PAGE_SIZE));
  const clampedPageIndex = Math.min(pageIndex, pageCount - 1);
  const pageStart = clampedPageIndex * PAGE_SIZE;
  const pageEndExclusive = Math.min(pageStart + PAGE_SIZE, filteredHomeowners.length);
  const pagedHomeowners = useMemo(() => {
    return filteredHomeowners.slice(pageStart, pageEndExclusive);
  }, [filteredHomeowners, pageStart, pageEndExclusive]);

  const handleOpenEdit = (homeowner: Homeowner) => {
    setEditingHomeowner(homeowner);
    setEditName(homeowner.name);
    setEditEmail(homeowner.email);
    setEditPhone(homeowner.phone || '');
    setEditStreet(homeowner.street || '');
    setEditCity(homeowner.city || '');
    setEditState(homeowner.state || '');
    setEditZip(homeowner.zip || '');
    setEditBuilderId(homeowner.builderUserId || '');
    setEditJobName(homeowner.jobName || '');
    setEditClosingDate(homeowner.closingDate ? new Date(homeowner.closingDate).toISOString().split('T')[0] : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHomeowner) return;

    const updatedHomeowner: Homeowner = {
      ...editingHomeowner,
      name: editName,
      email: editEmail,
      phone: editPhone,
      street: editStreet,
      city: editCity,
      state: editState,
      zip: editZip,
      address: `${editStreet}, ${editCity}, ${editState} ${editZip}`,
      builderUserId: editBuilderId || null,
      jobName: editJobName,
      closingDate: editClosingDate ? new Date(editClosingDate) : null,
    };

    onUpdateHomeowner(updatedHomeowner);
    setEditingHomeowner(null);
  };

  const handleDelete = (id: string) => {
    onDeleteHomeowner(id);
    setShowDeleteConfirm(null);
  };

  return (
    <div className="h-full flex flex-col bg-surface dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700/50 flex-shrink-0 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100">
              Homeowner Directory
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
              View and manage all homeowner records ({filteredHomeowners.length} total)
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-surface-on-variant dark:text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, address..."
              className="w-full pl-10 pr-4 py-2 bg-surface dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 placeholder-surface-on-variant dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Builder Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-surface-on-variant dark:text-gray-400 pointer-events-none z-10" />
            <select
              value={selectedBuilderId}
              onChange={(e) => setSelectedBuilderId(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="all">All Builders</option>
              {builderUsers.map(bu => (
                <option key={bu.id} value={bu.id}>
                  {bu.name || bu.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {pagedHomeowners.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Users className="h-16 w-16 mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="text-lg font-semibold text-surface-on dark:text-gray-100 mb-2">
              No homeowners found
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">
              {searchQuery || selectedBuilderId !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No homeowners have been enrolled yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pagedHomeowners.map((homeowner) => {
              const builder = builderUsers.find(bu => bu.id === homeowner.builderUserId);
              const isDeleting = showDeleteConfirm === homeowner.id;

              return (
                <div
                  key={homeowner.id}
                  className="bg-surface dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-all"
                >
                  {isDeleting ? (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-surface-on dark:text-gray-200">
                        Delete {homeowner.name}? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleDelete(homeowner.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Name & Email */}
                      <div className="md:col-span-3">
                        <p className="font-semibold text-surface-on dark:text-gray-100 truncate">
                          {homeowner.name}
                        </p>
                        <p className="text-xs text-surface-on-variant dark:text-gray-400 truncate">
                          {homeowner.email}
                        </p>
                      </div>

                      {/* Address */}
                      <div className="md:col-span-3">
                        <div className="flex items-center gap-2 text-sm text-surface-on-variant dark:text-gray-400">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{homeowner.address || '--'}</span>
                        </div>
                      </div>

                      {/* Builder */}
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2 text-sm text-surface-on-variant dark:text-gray-400">
                          <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{builder?.name || '--'}</span>
                        </div>
                      </div>

                      {/* Job Name */}
                      <div className="md:col-span-2">
                        <p className="text-sm text-surface-on-variant dark:text-gray-400 truncate">
                          {homeowner.jobName || '--'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="md:col-span-2 flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(homeowner)}
                          className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(homeowner.id)}
                          className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="border-t border-surface-outline-variant dark:border-gray-700 p-4 flex items-center justify-between bg-surface-container dark:bg-gray-700/50">
          <div className="text-sm text-surface-on-variant dark:text-gray-400">
            Showing {pageStart + 1}-{pageEndExclusive} of {filteredHomeowners.length}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
              disabled={pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
              disabled={pageIndex >= pageCount - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingHomeowner && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-elevation-3 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center flex-shrink-0">
              <h4 className="text-lg font-semibold text-surface-on dark:text-gray-100">
                Edit Homeowner
              </h4>
              <button
                onClick={() => setEditingHomeowner(null)}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on-variant dark:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                    Builder
                  </label>
                  <select
                    value={editBuilderId}
                    onChange={(e) => setEditBuilderId(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Select Builder --</option>
                    {builderUsers.map(bu => (
                      <option key={bu.id} value={bu.id}>
                        {bu.name || bu.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={editStreet}
                    onChange={(e) => setEditStreet(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={editState}
                      onChange={(e) => setEditState(e.target.value.toUpperCase())}
                      maxLength={2}
                      className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                      Zip
                    </label>
                    <input
                      type="text"
                      value={editZip}
                      onChange={(e) => setEditZip(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                    Job Name
                  </label>
                  <input
                    type="text"
                    value={editJobName}
                    onChange={(e) => setEditJobName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                    Closing Date
                  </label>
                  <input
                    type="date"
                    value={editClosingDate}
                    onChange={(e) => setEditClosingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container dark:bg-gray-700 border border-surface-outline-variant dark:border-gray-600 rounded-lg text-surface-on dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-surface-outline-variant dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingHomeowner(null)}
              >
                Cancel
              </Button>
              <Button type="submit" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeownersDirectoryView;
