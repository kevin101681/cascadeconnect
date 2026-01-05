import React, { useState, useMemo } from 'react';
import { Homeowner, BuilderGroup, BuilderUser } from '../types';
import Button from './Button';
import MaterialSelect from './MaterialSelect';
import { Edit2, Trash2, X, Search, Building2, MapPin, Phone, Mail, Calendar, Filter, Users } from 'lucide-react';

interface HomeownersListProps {
  homeowners: Homeowner[];
  builderGroups: BuilderGroup[]; // Legacy - kept for backward compatibility
  builderUsers: BuilderUser[]; // NEW: For filtering by builder users
  onUpdateHomeowner: (homeowner: Homeowner) => void;
  onDeleteHomeowner: (id: string) => void;
  onClose: () => void;
}

const HomeownersList: React.FC<HomeownersListProps> = ({
  homeowners,
  builderGroups,
  builderUsers,
  onUpdateHomeowner,
  onDeleteHomeowner,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilderId, setSelectedBuilderId] = useState<string>('all');
  const [editingHomeowner, setEditingHomeowner] = useState<Homeowner | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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

    // Filter by builder user (NEW: uses builderUserId)
    if (selectedBuilderId !== 'all') {
      filtered = filtered.filter(h => h.builderUserId === selectedBuilderId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h =>
        h.name.toLowerCase().includes(query) ||
        h.email.toLowerCase().includes(query) ||
        h.address.toLowerCase().includes(query) ||
        (h.jobName && h.jobName.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [homeowners, selectedBuilderId, searchQuery]);

  const handleOpenEdit = (homeowner: Homeowner) => {
    setEditingHomeowner(homeowner);
    setEditName(homeowner.name);
    setEditEmail(homeowner.email);
    setEditPhone(homeowner.phone || '');
    setEditStreet(homeowner.street || '');
    setEditCity(homeowner.city || '');
    setEditState(homeowner.state || '');
    setEditZip(homeowner.zip || '');
    setEditBuilderId(homeowner.builderUserId || ''); // NEW: Use builderUserId
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
      address: `${editStreet}, ${editCity}, ${editState} ${editZip}`.trim(),
      builderUserId: editBuilderId || undefined, // NEW: Save as builderUserId
      builderId: undefined, // Clear legacy field
      jobName: editJobName,
      closingDate: editClosingDate ? new Date(editClosingDate) : editingHomeowner.closingDate
    };

    await onUpdateHomeowner(updatedHomeowner);
    setEditingHomeowner(null);
  };

  const handleDelete = async (id: string) => {
    await onDeleteHomeowner(id);
    setShowDeleteConfirm(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-[backdrop-fade-in_0.2s_ease-out]">
      <div className="bg-surface dark:bg-gray-800 w-full max-w-6xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] my-8">
        <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-normal text-surface-on dark:text-gray-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Homeowners
            </h3>
            <p className="text-sm text-surface-on-variant dark:text-gray-400">
              {filteredHomeowners.length} {filteredHomeowners.length === 1 ? 'homeowner' : 'homeowners'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-full hover:bg-surface-container dark:hover:bg-gray-600 text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-outline-variant dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, address, or job name..."
              className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Builder Filter */}
          <MaterialSelect
            label="Builder"
            value={selectedBuilderId}
            onChange={(value) => setSelectedBuilderId(value)}
            options={[
              { value: 'all', label: 'All Builders' },
              ...builderUsers.map(bu => ({ value: bu.id, label: bu.name }))
            ]}
            className="min-w-[200px]"
          />
      </div>

        {/* Homeowners List */}
        <div className="space-y-3">
          {filteredHomeowners.length === 0 ? (
            <div className="text-center py-12 bg-surface-container dark:bg-gray-700 rounded-xl">
              <Building2 className="h-12 w-12 text-surface-outline-variant dark:text-gray-500 mx-auto mb-4 opacity-50" />
              <p className="text-surface-on-variant dark:text-gray-400">
                {searchQuery || selectedBuilderId !== 'all' 
                  ? 'No homeowners match your filters.' 
                  : 'No homeowners found.'}
              </p>
            </div>
          ) : (
            filteredHomeowners.map(homeowner => {
              const builderGroup = builderGroups.find(bg => bg.id === homeowner.builderId);
              
              return (
                <div
                  key={homeowner.id}
                  className="bg-surface-container dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600 hover:shadow-elevation-1 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-surface-on dark:text-gray-100">
                          {homeowner.name}
                        </h3>
                        {builderGroup && (
                          <span className="bg-primary-container dark:bg-primary/20 text-primary-on-container dark:text-primary text-xs font-medium px-2 py-1 rounded-full">
                            {builderGroup.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-surface-on-variant dark:text-gray-400">
                        {homeowner.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{homeowner.email}</span>
                          </div>
                        )}
                        {homeowner.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{homeowner.phone}</span>
                          </div>
                        )}
                        {homeowner.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{homeowner.address}</span>
                          </div>
                        )}
                        {homeowner.jobName && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>{homeowner.jobName}</span>
                          </div>
                        )}
                        {homeowner.closingDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(homeowner.closingDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="filled"
                        onClick={() => handleOpenEdit(homeowner)}
                        icon={<Edit2 className="h-4 w-4" />}
                        className="bg-primary text-primary-on hover:bg-primary/90 dark:hover:bg-primary/80"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="filled"
                        onClick={() => setShowDeleteConfirm(homeowner.id)}
                        icon={<Trash2 className="h-4 w-4" />}
                        className="bg-primary text-primary-on hover:bg-primary/90 dark:hover:bg-primary/80"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      {/* Edit Modal */}
      {editingHomeowner && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingHomeowner(null);
          }}
        >
          <div 
            className="bg-surface dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] border border-surface-outline-variant/50 dark:border-gray-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700 flex justify-between items-center bg-surface-container dark:bg-gray-700">
              <h2 className="text-lg font-normal text-surface-on dark:text-gray-100">Edit Homeowner</h2>
              <button 
                onClick={() => setEditingHomeowner(null)} 
                className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Job Name</label>
                  <input
                    type="text"
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={editJobName}
                    onChange={(e) => setEditJobName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Street</label>
                <input
                  type="text"
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={editStreet}
                  onChange={(e) => setEditStreet(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">City</label>
                  <input
                    type="text"
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">State</label>
                  <input
                    type="text"
                    maxLength={2}
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-1.5 py-2 text-sm text-center text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none min-w-0"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Zip</label>
                  <input
                    type="text"
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={editZip}
                    onChange={(e) => setEditZip(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Builder</label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 pr-10 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none"
                    value={editBuilderId}
                    onChange={(e) => setEditBuilderId(e.target.value)}
                  >
                    <option value="">Select Builder...</option>
                    {builderUsers.map(bu => (
                      <option key={bu.id} value={bu.id}>{bu.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-6 h-6 rounded-full bg-surface-container dark:bg-gray-600 flex items-center justify-center">
                      <Building2 className="h-3.5 w-3.5 text-surface-on-variant dark:text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-on-variant dark:text-gray-400 mb-1">Closing Date</label>
                <input
                  type="date"
                  className="w-full bg-surface-container-high dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-surface-on dark:text-gray-100 border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={editClosingDate}
                  onChange={(e) => setEditClosingDate(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="text" 
                  onClick={() => setEditingHomeowner(null)}
                  className="bg-surface-container-high dark:bg-gray-700 hover:bg-surface-container dark:hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="filled">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(null);
          }}
        >
          <div 
            className="bg-surface dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-elevation-3 overflow-hidden animate-[scale-in_0.2s_ease-out] border border-surface-outline-variant/50 dark:border-gray-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-surface-outline-variant dark:border-gray-700">
              <h2 className="text-lg font-medium text-surface-on dark:text-gray-100">Delete Homeowner</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-surface-on-variant dark:text-gray-400 mb-6">
                Are you sure you want to delete this homeowner? This action cannot be undone and will also delete all associated claims, documents, and messages.
              </p>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="text" 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="bg-surface-container-high dark:bg-gray-700 hover:bg-surface-container dark:hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button 
                  variant="filled" 
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="bg-error text-error-on hover:bg-error/90"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default HomeownersList;

