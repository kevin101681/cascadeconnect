import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, View, Event as CalendarEvent } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar-custom.css';
import { Lock, Plus, X, Calendar as CalendarIcon, Clock, Mail, FileText, MapPin, Building2, Search } from 'lucide-react';
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
  title: string;
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

  // Homeowner search state
  const [homeownerSearch, setHomeownerSearch] = useState('');
  const [selectedHomeowner, setSelectedHomeowner] = useState<Homeowner | null>(null);
  const [showHomeownerDropdown, setShowHomeownerDropdown] = useState(false);

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

  // Filter homeowners based on search
  const filteredHomeowners = homeowners.filter(h => 
    (h.name || "").toLowerCase().includes((homeownerSearch || "").toLowerCase()) ||
    (h.address || "").toLowerCase().includes((homeownerSearch || "").toLowerCase()) ||
    (h.builder || "").toLowerCase().includes((homeownerSearch || "").toLowerCase()) ||
    (h.jobName || "").toLowerCase().includes((homeownerSearch || "").toLowerCase())
  );

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
    setSelectedHomeowner(null);
    setHomeownerSearch('');
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
            className="px-4 py-2 text-sm font-medium rounded-full border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium rounded-full border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="px-4 py-2 text-sm font-medium rounded-full border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors"
          >
            Next
          </button>
        </div>

        {label()}

        <div className="flex items-center gap-2">
          <button
            onClick={() => toolbar.onView('month')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              toolbar.view === 'month'
                ? 'border border-primary text-primary bg-primary/10'
                : 'border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => toolbar.onView('week')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              toolbar.view === 'week'
                ? 'border border-primary text-primary bg-primary/10'
                : 'border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => toolbar.onView('day')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              toolbar.view === 'day'
                ? 'border border-primary text-primary bg-primary/10'
                : 'border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 hover:bg-surface-container-high dark:hover:bg-gray-700'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => toolbar.onView('agenda')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              toolbar.view === 'agenda'
                ? 'border border-primary text-primary bg-primary/10'
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
    <div className="h-full flex flex-col">
      {/* Header - COMPACT & STANDARDIZED */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-surface-outline-variant dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 md:rounded-t-3xl">
        <h2 className="text-xl font-semibold text-surface-on dark:text-gray-100 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Schedule
        </h2>
        <button
          onClick={openCreateModal}
          style={{
            height: '36px',
            padding: '0 16px',
            backgroundColor: "white",
            color: "#3c6b80",
            border: "2px solid #3c6b80",
            borderRadius: "9999px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.875rem",
            fontWeight: "500"
          }}
          className="hover:bg-gray-50 transition-colors"
          title="New Appointment"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">New Event</span>
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 bg-surface-container/50 dark:bg-gray-800/50">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-surface-on-variant dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded"></div>
            <span>Shared</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-600 rounded flex items-center justify-center">
              <Lock className="h-2 w-2 text-white" />
            </div>
            <span>Internal Only</span>
          </div>
        </div>

        {/* Calendar */}
        {/* react-big-calendar uses percentage heights internally; give the wrapper an explicit height so the month grid can't collapse */}
        <div className="h-[70vh] min-h-[600px] bg-surface dark:bg-gray-900 rounded-2xl p-4">
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
      </div>

      {/* Modal - Create/View Appointment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container dark:bg-gray-800 rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-outline-variant dark:border-gray-700 bg-surface-container/30 dark:bg-gray-700/30">
              <h3 className="text-xl font-semibold text-surface-on dark:text-gray-100">
                {isCreateMode ? 'Create Appointment' : selectedAppointment?.title}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-surface-on-variant dark:text-gray-400 hover:text-surface-on dark:hover:text-gray-200 p-2 hover:bg-surface-container-high dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {isCreateMode ? (
                // Create Form
                <>
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-surface-outline dark:border-gray-600 rounded-2xl bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100 focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="e.g., Inspection with John"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-surface-outline dark:border-gray-600 rounded-2xl bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100 focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                      rows={3}
                      placeholder="Additional details..."
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                        Start Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-4 py-3 border border-surface-outline dark:border-gray-600 rounded-2xl bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100 focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                        End Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-4 py-3 border border-surface-outline dark:border-gray-600 rounded-2xl bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100 focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-4 py-3 border border-surface-outline dark:border-gray-600 rounded-2xl bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100 focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="repair">Repair</option>
                      <option value="inspection">Inspection</option>
                      <option value="phone_call">Phone Call</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Homeowner Search */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                      Homeowner
                    </label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-on-variant dark:text-gray-400" />
                      <input
                        type="text"
                        value={selectedHomeowner ? selectedHomeowner.name : homeownerSearch}
                        onChange={(e) => {
                          setHomeownerSearch(e.target.value);
                          setShowHomeownerDropdown(true);
                          if (selectedHomeowner) {
                            setSelectedHomeowner(null);
                            setFormData({ ...formData, homeownerId: '' });
                          }
                        }}
                        onFocus={() => setShowHomeownerDropdown(true)}
                        placeholder="Search homeowners..."
                        className="w-full pl-11 pr-4 py-3 border border-surface-outline dark:border-gray-600 rounded-2xl bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100 focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                      {selectedHomeowner && (
                        <button
                          onClick={() => {
                            setSelectedHomeowner(null);
                            setFormData({ ...formData, homeownerId: '' });
                            setHomeownerSearch('');
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-on-variant hover:text-surface-on p-1 rounded-full hover:bg-surface-container-high dark:hover:bg-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Homeowner Dropdown */}
                    {showHomeownerDropdown && !selectedHomeowner && homeownerSearch && (
                      <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-gray-800 rounded-2xl shadow-elevation-3 border border-surface-outline-variant dark:border-gray-700 max-h-80 overflow-y-auto">
                        {filteredHomeowners.length > 0 ? (
                          filteredHomeowners.map((homeowner) => (
                            <button
                              key={homeowner.id}
                              onClick={() => {
                                setSelectedHomeowner(homeowner);
                                setFormData({ ...formData, homeownerId: homeowner.id });
                                setShowHomeownerDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-surface-container dark:hover:bg-gray-700 border-b border-surface-outline-variant/50 dark:border-gray-700/50 last:border-0 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-surface-on dark:text-gray-100 truncate">{homeowner.name}</p>
                                  {homeowner.builder && (
                                    <p className="text-xs text-surface-on-variant dark:text-gray-300 truncate mt-0.5 flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {homeowner.builder}
                                    </p>
                                  )}
                                  {homeowner.jobName && (
                                    <p className="text-xs text-primary font-medium truncate mt-0.5">
                                      {homeowner.jobName}
                                    </p>
                                  )}
                                  {homeowner.address && (
                                    <p className="text-xs text-surface-on-variant dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {homeowner.address}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-surface-on-variant dark:text-gray-400 text-sm">
                            No homeowners found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                      Visibility
                    </label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                      className="w-full px-4 py-3 border border-surface-outline dark:border-gray-600 rounded-2xl bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100 focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="shared_with_homeowner">Shared with Homeowner</option>
                      <option value="internal_only">Internal Only 🔒</option>
                    </select>
                    {formData.visibility === 'internal_only' && (
                      <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-2">
                        This appointment will not be visible to the homeowner and no email will be sent to them.
                      </p>
                    )}
                  </div>

                  {/* Guest Emails */}
                  <div>
                    <label className="block text-sm font-medium text-surface-on dark:text-gray-200 mb-2">
                      Guest Emails (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="john@example.com, jane@example.com"
                      onChange={(e) => {
                        const emails = e.target.value.split(',').map(email => email.trim()).filter(Boolean);
                        setFormData({ ...formData, guests: emails.map(email => ({ email })) });
                      }}
                      className="w-full px-4 py-3 border border-surface-outline dark:border-gray-600 rounded-2xl bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-100 focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-3 border border-surface-outline dark:border-gray-600 text-surface-on dark:text-gray-200 rounded-full hover:bg-surface-container-high dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!formData.title || !formData.startTime || !formData.endTime}
                      className="px-6 py-3 border border-primary text-primary rounded-full hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      Create Appointment
                    </button>
                  </div>
                </>
              ) : (
                // View Details
                selectedAppointment && (
                  <>
                    <div className="space-y-4">
                      {/* Date & Time */}
                      <div className="flex items-start gap-3 p-4 bg-surface-container-high dark:bg-gray-700 rounded-2xl">
                        <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-surface-on dark:text-gray-200">Date & Time</p>
                          <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
                            {new Date(selectedAppointment.startTime).toLocaleString()} - {new Date(selectedAppointment.endTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      {selectedAppointment.description && (
                        <div className="flex items-start gap-3 p-4 bg-surface-container-high dark:bg-gray-700 rounded-2xl">
                          <FileText className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-surface-on dark:text-gray-200">Description</p>
                            <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
                              {selectedAppointment.description}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Visibility */}
                      <div className="flex items-start gap-3 p-4 bg-surface-container-high dark:bg-gray-700 rounded-2xl">
                        <Lock className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-surface-on dark:text-gray-200">Visibility</p>
                          <p className="text-sm text-surface-on-variant dark:text-gray-400 mt-1">
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

                      {/* Guests */}
                      {selectedAppointment.guests && selectedAppointment.guests.length > 0 && (
                        <div className="flex items-start gap-3 p-4 bg-surface-container-high dark:bg-gray-700 rounded-2xl">
                          <Mail className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-surface-on dark:text-gray-200">Guests</p>
                            <ul className="text-sm text-surface-on-variant dark:text-gray-400 mt-1 space-y-1">
                              {selectedAppointment.guests.map((guest, idx) => (
                                <li key={idx}>{guest.email}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-outline-variant dark:border-gray-700">
                      <button
                        onClick={() => handleDelete(selectedAppointment.id)}
                        className="flex items-center gap-2 px-6 py-3 text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-3 bg-surface-container-high dark:bg-gray-700 text-surface-on dark:text-gray-200 rounded-full hover:bg-surface-container-highest dark:hover:bg-gray-600 transition-colors"
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
