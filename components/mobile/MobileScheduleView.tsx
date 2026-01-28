import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Loader2, Lock, MapPin, Plus, X } from 'lucide-react';
import type { Claim, Homeowner, UserRole } from '../../types';

type AppointmentVisibility = 'internal_only' | 'shared_with_homeowner';
type AppointmentType = 'repair' | 'inspection' | 'phone_call' | 'other';

export interface MobileScheduleEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  homeownerId?: string;
  visibility: AppointmentVisibility;
  type: AppointmentType;
  guests?: { id?: string; email: string; role?: string }[];
  claimId?: string;
}

export interface MobileScheduleViewProps {
  homeowners: Homeowner[];
  claims?: Claim[];
  userRole?: UserRole;
  activeHomeownerId?: string;
  currentUserId?: string;
  isAdmin?: boolean;
  onClose?: () => void;
  onEventClick?: (event: MobileScheduleEvent) => void;
  onNewEvent?: () => void;
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const formatTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const formatDateLabel = (d: Date) =>
  d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

const typeLabel = (t: AppointmentType) => {
  switch (t) {
    case 'repair':
      return 'Repair';
    case 'inspection':
      return 'Inspection';
    case 'phone_call':
      return 'Call';
    default:
      return 'Other';
  }
};

const typeBadgeClasses = (t: AppointmentType) => {
  switch (t) {
    case 'repair':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
    case 'inspection':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
    case 'phone_call':
      return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-200 dark:border-gray-700';
  }
};

export const MobileScheduleView: React.FC<MobileScheduleViewProps> = ({
  homeowners,
  claims = [],
  userRole,
  activeHomeownerId,
  currentUserId,
  isAdmin = false,
  onClose,
  onEventClick,
  onNewEvent,
}) => {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<MobileScheduleEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MobileScheduleEvent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<{
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    visibility: AppointmentVisibility;
    type: AppointmentType;
  }>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    visibility: 'shared_with_homeowner',
    type: 'other',
  });

  const activeHomeowner = useMemo(
    () => homeowners.find((h) => h.id === activeHomeownerId) || null,
    [homeowners, activeHomeownerId]
  );

  const apiEndpoint = useMemo(() => {
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    return isLocalDev
      ? 'http://localhost:8888/.netlify/functions/appointments'
      : `${window.location.protocol}//${window.location.hostname}/.netlify/functions/appointments`;
  }, []);

  const fetchEvents = useCallback(async () => {
    // Guard against placeholder/invalid IDs to avoid 400s (matches ScheduleTab behavior)
    if (!activeHomeownerId || activeHomeownerId === 'placeholder' || activeHomeownerId.length < 10) {
      setEvents([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(apiEndpoint);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const data = await response.json();

      // API returns appointments + claim repair dates merged together
      const filtered = Array.isArray(data) ? data.filter((item: any) => item.homeownerId === activeHomeownerId) : [];

      const normalized: MobileScheduleEvent[] = filtered
        .map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          startTime: new Date(item.startTime),
          endTime: new Date(item.endTime),
          homeownerId: item.homeownerId,
          visibility: (item.visibility || 'shared_with_homeowner') as AppointmentVisibility,
          type: (item.type || 'other') as AppointmentType,
          guests: item.guests || [],
          claimId: item.id?.startsWith?.('claim-') ? item.claimId : undefined,
        }))
        .filter((e) => !Number.isNaN(e.startTime.getTime()))
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      setEvents(normalized);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [activeHomeownerId, apiEndpoint]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const grouped = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcoming = events.filter((e) => e.endTime.getTime() >= Date.now() - 5 * 60 * 1000);

    const map = new Map<string, { date: Date; label: string; items: MobileScheduleEvent[] }>();
    for (const ev of upcoming) {
      const day = startOfDay(ev.startTime);
      const key = day.toISOString().slice(0, 10);
      const label = isSameDay(day, today) ? 'Today' : isSameDay(day, tomorrow) ? 'Tomorrow' : formatDateLabel(day);
      const entry = map.get(key) || { date: day, label, items: [] };
      entry.items.push(ev);
      map.set(key, entry);
    }

    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events]);

  const handleOpenEvent = (ev: MobileScheduleEvent) => {
    onEventClick?.(ev);
    setSelectedEvent(ev);
  };

  const handleOpenCreate = () => {
    onNewEvent?.();
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!activeHomeownerId) return;
    if (!createForm.title || !createForm.startTime || !createForm.endTime) return;

    try {
      setLoading(true);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          homeownerId: activeHomeownerId,
          createdById: currentUserId,
        }),
      });
      if (!response.ok) throw new Error('Failed to create appointment');
      setShowCreate(false);
      setCreateForm({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        visibility: 'shared_with_homeowner',
        type: 'other',
      });
      await fetchEvents();
    } catch (err) {
      console.error('Error creating appointment:', err);
      alert('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header (Clean Tab Theme) */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Schedule</h2>
          {activeHomeowner?.name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activeHomeowner.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 text-primary border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">New Event</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close schedule"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!loading && grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400">No upcoming events</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Tap “New Event” to add one.</p>
          </div>
        )}

        {!loading &&
          grouped.map((section) => (
            <div key={section.date.toISOString()} className="space-y-2">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 px-1">
                {section.label}
              </div>
              <div className="space-y-2">
                {section.items.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => handleOpenEvent(ev)}
                    className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium">{formatTime(ev.startTime)}</span>
                          <span className="text-gray-400">–</span>
                          <span className="font-medium">{formatTime(ev.endTime)}</span>
                          {ev.visibility === 'internal_only' && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Lock className="h-3 w-3" />
                              Internal
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {ev.title}
                        </div>
                        {activeHomeowner?.address && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{activeHomeowner.address}</span>
                          </div>
                        )}
                      </div>
                      <span
                        className={[
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                          typeBadgeClasses(ev.type),
                        ].join(' ')}
                      >
                        {typeLabel(ev.type)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {selectedEvent.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedEvent.startTime.toLocaleString()} – {selectedEvent.endTime.toLocaleTimeString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={[
                    'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
                    typeBadgeClasses(selectedEvent.type),
                  ].join(' ')}
                >
                  {typeLabel(selectedEvent.type)}
                </span>
                {selectedEvent.visibility === 'internal_only' && (
                  <span className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <Lock className="h-4 w-4 text-primary" />
                    Internal Only
                  </span>
                )}
              </div>

              {selectedEvent.description && (
                <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                  {selectedEvent.description}
                </div>
              )}

              {selectedEvent.guests && selectedEvent.guests.length > 0 && (
                <div className="text-sm text-gray-700 dark:text-gray-200">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Guests</div>
                  <div className="space-y-1">
                    {selectedEvent.guests.map((g, idx) => (
                      <div key={`${g.email}-${idx}`} className="text-xs text-gray-600 dark:text-gray-300">
                        {g.email}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Event</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Title</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Inspection"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="Optional"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Start</label>
                  <input
                    type="datetime-local"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">End</label>
                  <input
                    type="datetime-local"
                    value={createForm.endTime}
                    onChange={(e) => setCreateForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Type</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value as AppointmentType }))}
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="repair">Repair</option>
                    <option value="inspection">Inspection</option>
                    <option value="phone_call">Phone Call</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Visibility</label>
                  <select
                    value={createForm.visibility}
                    onChange={(e) => setCreateForm((p) => ({ ...p, visibility: e.target.value as AppointmentVisibility }))}
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="shared_with_homeowner">Shared</option>
                    <option value="internal_only">Internal Only</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 h-11 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!createForm.title || !createForm.startTime || !createForm.endTime || !activeHomeownerId}
                  className="flex-1 h-11 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>

              {/* Small context hint */}
              {isAdmin && userRole && (
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Creating events for the selected homeowner in mobile list view.
                </div>
              )}
              {claims.length > 0 && (
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Upcoming list also includes claim repair dates (from API merge).
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileScheduleView;

