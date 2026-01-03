import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, View, Event as CalendarEvent } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar-custom.css';
import { Lock, Plus, Edit2, Trash2, X, Calendar as CalendarIcon, Clock, User, Users, Mail, FileText } from 'lucide-react';
import { Homeowner } from '../types';

const localizer = momentLocalizer(moment);

// Appointment interface
interface Appointment {
  id: string;
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  homeownerId?: string;
  visibility: 'internal_only' | 'shared_with_homeowner';
  type: 'repair' | 'inspection' | 'phone_call' | 'other';
  guests?: { id: string; email: string; role?: string }[];
}

// Transform appointment to calendar event
interface AppointmentEvent extends CalendarEvent {
  id: string;
  title: string; // Required by react-big-calendar
  start: Date;
  end: Date;
  visibility: 'internal_only' | 'shared_with_homeowner';
  type: string;
  appointment: Appointment;
}

interface ScheduleTabProps {
  homeowners: Homeowner[];
  currentUserId?: string;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ homeowners, currentUserId }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  // Form state for create/edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    homeownerId: '',
    visibility: 'shared_with_homeowner' as 'internal_only' | 'shared_with_homeowner',
    type: 'other' as 'repair' | 'inspection' | 'phone_call' | 'other',
    guests: [] as { email: string; role?: string }[],
  });

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiEndpoint = isLocalDev 
        ? 'http://localhost:8888/.netlify/functions/appointments'
        : `${window.location.protocol}//${window.location.hostname}/.netlify/functions/appointments`;
      
      const response = await fetch(apiEndpoint);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      
      const data = await response.json();
      setAppointments(data);
      
      // Transform to calendar events
      const calendarEvents: AppointmentEvent[] = data.map((appt: Appointment) => ({
        id: appt.id,
        title: appt.title,
        start: new Date(appt.startTime),
        end: new Date(appt.endTime),
        visibility: appt.visibility,
        type: appt.type,
        appointment: appt,
      }));
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Handle appointment creation
  const handleCreate = async () => {
    try {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiEndpoint = isLocalDev 
        ? 'http://localhost:8888/.netlify/functions/appointments'
        : `${window.location.protocol}//${window.location.hostname}/.netlify/functions/appointments`;
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdById: currentUserId,
        }),
      });

      if (!response.ok) throw new Error('Failed to create appointment');
      
      await fetchAppointments();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment');
    }
  };

  // Handle appointment deletion
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    try {
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiEndpoint = isLocalDev 
        ? `http://localhost:8888/.netlify/functions/appointments/${id}`
        : `${window.location.protocol}//${window.location.hostname}/.netlify/functions/appointments/${id}`;
      
      const response = await fetch(apiEndpoint, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete appointment');
      
      await fetchAppointments();
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      homeownerId: '',
      visibility: 'shared_with_homeowner',
      type: 'other',
      guests: [],
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateMode(true);
    setIsModalOpen(true);
  };

  const openViewModal = (event: AppointmentEvent) => {
    setSelectedAppointment(event.appointment);
    setIsCreateMode(false);
    setIsModalOpen(true);
  };

  // Custom event style getter - adds internal event class
  const eventStyleGetter = (event: AppointmentEvent) => {
    const isInternal = event.visibility === 'internal_only';
    
    return {
      className: isInternal ? 'internal-event' : '',
    };
  };

  // Custom toolbar component
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span className="text-lg font-semibold text-surface-on dark:text-gray-100">
          {toolbar.view === 'month' && date.format('MMMM YYYY')}
          {toolbar.view === 'week' && `Week of ${date.format('MMM D, YYYY')}`}
          {toolbar.view === 'day' && date.format('MMMM D, YYYY')}
          {toolbar.view === 'agenda' && date.format('MMMM YYYY')}
        </span>
      );
    };

    return (
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-surface-outline-variant dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={goToBack}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors"
          >
            Next
          </button>
        </div>

        {label()}

        <div className="flex items-center gap-2">
          <button
            onClick={() => toolbar.onView('month')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              toolbar.view === 'month'
                ? 'bg-primary text-primary-on'
                : 'border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => toolbar.onView('week')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              toolbar.view === 'week'
                ? 'bg-primary text-primary-on'
                : 'border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => toolbar.onView('day')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              toolbar.view === 'day'
                ? 'bg-primary text-primary-on'
                : 'border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => toolbar.onView('agenda')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              toolbar.view === 'agenda'
                ? 'bg-primary text-primary-on'
                : 'border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700'
            }`}
          >
            Agenda
          </button>
        </div>
      </div>
    );
  };

  // Custom event component - show lock icon for internal events
  const EventComponent = ({ event }: { event: AppointmentEvent }) => {
    return (
      <div className="flex items-center gap-1 px-1">
        {event.visibility === 'internal_only' && (
          <Lock className="h-3 w-3 flex-shrink-0" />
        )}
        <span className="truncate text-xs">{event.title}</span>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-surface-container dark:bg-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-on dark:text-gray-100">Schedule</h2>
          <p className="text-sm text-surface-on-variant dark:text-gray-400">
            Manage appointments and send calendar invites
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-surface-on-variant dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-primary rounded"></div>
          <span>Shared</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-slate-600 rounded flex items-center justify-center">
            <Lock className="h-2 w-2 text-white" />
          </div>
          <span>Internal Only</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 min-h-0">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          onSelectEvent={openViewModal}
          eventPropGetter={eventStyleGetter}
          components={{
            toolbar: CustomToolbar,
            event: EventComponent,
          }}
        />
      </div>

      {/* Modal - Create/View Appointment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-outline-variant dark:border-gray-700">
              <h3 className="text-xl font-semibold text-surface-on dark:text-gray-100">
                {isCreateMode ? 'Create Appointment' : selectedAppointment?.title}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {isCreateMode ? (
                // Create Form
                <>
                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-outline dark:border-gray-600 rounded-lg bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100"
                      placeholder="e.g., Inspection with John"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-outline dark:border-gray-600 rounded-lg bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100"
                      rows={3}
                      placeholder="Additional details..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-1">
                        Start Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-surface-outline dark:border-gray-600 rounded-lg bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-1">
                        End Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-3 py-2 border border-surface-outline dark:border-gray-600 rounded-lg bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-1">
                        Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-surface-outline dark:border-gray-600 rounded-lg bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100"
                      >
                        <option value="repair">Repair</option>
                        <option value="inspection">Inspection</option>
                        <option value="phone_call">Phone Call</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-1">
                        Homeowner
                      </label>
                      <select
                        value={formData.homeownerId}
                        onChange={(e) => setFormData({ ...formData, homeownerId: e.target.value })}
                        className="w-full px-3 py-2 border border-surface-outline dark:border-gray-600 rounded-lg bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100"
                      >
                        <option value="">Select Homeowner</option>
                        {homeowners.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-1">
                      Visibility
                    </label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                      className="w-full px-3 py-2 border border-surface-outline dark:border-gray-600 rounded-lg bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100"
                    >
                      <option value="shared_with_homeowner">Shared with Homeowner</option>
                      <option value="internal_only">Internal Only 🔒</option>
                    </select>
                    {formData.visibility === 'internal_only' && (
                      <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1">
                        This appointment will not be visible to the homeowner and no email will be sent to them.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-1">
                      Guest Emails (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="john@example.com, jane@example.com"
                      onChange={(e) => {
                        const emails = e.target.value.split(',').map(email => email.trim()).filter(Boolean);
                        setFormData({ ...formData, guests: emails.map(email => ({ email })) });
                      }}
                      className="w-full px-3 py-2 border border-surface-outline dark:border-gray-600 rounded-lg bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 rounded-lg hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!formData.title || !formData.startTime || !formData.endTime}
                      className="px-4 py-2 bg-primary text-primary-on rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Appointment
                    </button>
                  </div>
                </>
              ) : (
                // View Details
                selectedAppointment && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CalendarIcon className="h-5 w-5 text-surface-on-variant dark:text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-surface-on dark:text-gray-200">Date & Time</p>
                          <p className="text-sm text-surface-on-variant dark:text-gray-400">
                            {new Date(selectedAppointment.startTime).toLocaleString()} - {new Date(selectedAppointment.endTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {selectedAppointment.description && (
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-surface-on-variant dark:text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-surface-on dark:text-gray-200">Description</p>
                            <p className="text-sm text-surface-on-variant dark:text-gray-400">
                              {selectedAppointment.description}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-surface-on-variant dark:text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-surface-on dark:text-gray-200">Visibility</p>
                          <p className="text-sm text-surface-on-variant dark:text-gray-400">
                            {selectedAppointment.visibility === 'internal_only' ? (
                              <span className="flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Internal Only
                              </span>
                            ) : (
                              'Shared with Homeowner'
                            )}
                          </p>
                        </div>
                      </div>

                      {selectedAppointment.guests && selectedAppointment.guests.length > 0 && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-surface-on-variant dark:text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-surface-on dark:text-gray-200">Guests</p>
                            <ul className="text-sm text-surface-on-variant dark:text-gray-400">
                              {selectedAppointment.guests.map((guest, idx) => (
                                <li key={idx}>{guest.email}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                      <button
                        onClick={() => handleDelete(selectedAppointment.id)}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-200 rounded-lg hover:bg-surface-container-highest dark:hover:bg-gray-600 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleTab;

