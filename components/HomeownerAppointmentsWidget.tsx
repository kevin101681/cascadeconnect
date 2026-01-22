import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface Appointment {
  id: string;
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  description?: string;
  type: 'repair' | 'inspection' | 'phone_call' | 'other';
}

interface HomeownerAppointmentsWidgetProps {
  homeownerId: string;
  maxDisplay?: number;
}

const HomeownerAppointmentsWidget: React.FC<HomeownerAppointmentsWidgetProps> = ({ 
  homeownerId, 
  maxDisplay = 3 
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      // GUARD CLAUSE: Validate homeownerId before fetching
      if (!homeownerId || homeownerId === 'placeholder' || homeownerId.length < 10) {
        console.warn('⚠️ Invalid homeownerId, skipping appointments fetch');
        setLoading(false);
        return;
      }

      // Validate UUID format to prevent 400 errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(homeownerId)) {
        console.warn(`⚠️ Invalid homeownerId UUID format, skipping appointments fetch: ${homeownerId}`);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiEndpoint = isLocalDev 
          ? `http://localhost:8888/.netlify/functions/appointments?homeownerId=${homeownerId}&visibility=shared_with_homeowner`
          : `${window.location.protocol}//${window.location.hostname}/.netlify/functions/appointments?homeownerId=${homeownerId}&visibility=shared_with_homeowner`;
        
        const response = await fetch(apiEndpoint);
        if (!response.ok) throw new Error('Failed to fetch appointments');
        
        const data = await response.json();
        
        // Filter to upcoming appointments only and sort by start time
        const now = new Date();
        const upcomingAppointments = data
          .filter((appt: Appointment) => new Date(appt.startTime) > now)
          .sort((a: Appointment, b: Appointment) => 
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          )
          .slice(0, maxDisplay);
        
        setAppointments(upcomingAppointments);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [homeownerId, maxDisplay]);

  if (loading) {
    return (
      <div className="bg-surface-container-high dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-surface-on dark:text-gray-100">Upcoming Appointments</h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-surface-container dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-surface-container-high dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-surface-on dark:text-gray-100">Upcoming Appointments</h3>
        </div>
        <p className="text-xs text-surface-on-variant dark:text-gray-400">No upcoming appointments</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-high dark:bg-gray-700 rounded-xl p-4 border border-surface-outline-variant dark:border-gray-600">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-surface-on dark:text-gray-100">Upcoming Appointments</h3>
      </div>
      
      <div className="space-y-2">
        {appointments.map((appointment) => {
          const startDate = new Date(appointment.startTime);
          const endDate = new Date(appointment.endTime);
          
          return (
            <div 
              key={appointment.id}
              className="bg-surface-container dark:bg-gray-600 rounded-lg p-3 border border-surface-outline-variant dark:border-gray-500"
            >
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-on dark:text-gray-100 truncate">
                    {appointment.title}
                  </p>
                  <p className="text-xs text-surface-on-variant dark:text-gray-300 mt-1">
                    {startDate.toLocaleDateString()} • {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {appointment.description && (
                    <p className="text-xs text-surface-on-variant dark:text-gray-400 mt-1 line-clamp-2">
                      {appointment.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HomeownerAppointmentsWidget;

