# Quick Start Guide - Schedule Tab

## 🚀 Setup (5 minutes)

### 1. Create Database Tables
```bash
npm run create-appointments-tables
```

**Note**: If you get a database connection error, make sure you have a `.env.local` file with `VITE_DATABASE_URL` set. You can also pass the database URL directly:
```bash
npm run create-appointments-tables -- "postgresql://user:pass@host/db"
```

### 2. Verify Tab Appears
1. Login as Admin
2. Navigate to Dashboard
3. Look for "Schedule" tab (between Calls and Payroll tabs)
4. Click it - you should see the calendar

### 3. Create Your First Appointment
1. Click "New Appointment" button
2. Fill in:
   - **Title**: "Test Inspection"
   - **Start Time**: Tomorrow at 10:00 AM
   - **End Time**: Tomorrow at 11:00 AM
   - **Type**: Inspection
   - **Homeowner**: Select from dropdown
   - **Visibility**: Shared with Homeowner
   - **Guest Emails**: your@email.com
3. Click "Create Appointment"
4. Check your email for the calendar invite!

## 🎯 Key Features

### For Admins
- **Schedule Tab**: Full calendar view with month/week/day/agenda views
- **Create Appointments**: Click any date or use "New Appointment" button
- **Internal Events**: Use 🔒 "Internal Only" visibility for staff meetings
- **Guest Invites**: Automatically sends `.ics` files via email
- **Edit/Delete**: Click events to view details and manage

### For Homeowners
- **Appointments Widget**: Shows next 3 upcoming appointments
- **Auto-Filtered**: Only sees appointments shared with them
- **Clean Display**: Date, time, title, description

### For Vapi AI Agent
```typescript
import { getUpcomingAppointments } from '../lib/services/appointmentService';

// In your Vapi tool:
const response = await getUpcomingAppointments(homeownerId);
// Returns: "You have 2 upcoming appointments: 
//           1. Inspection on Monday, January 6, 2026 at 10:00 AM
//           2. Repair on Friday, January 10, 2026 at 2:00 PM"
```

## 🎨 Visual Reference

### Schedule Tab (Admin View)
- **Toolbar**: Next/Back/Today buttons + Month/Week/Day/Agenda view selectors
- **Legend**: Blue = Shared, Gray with 🔒 = Internal Only
- **Events**: Click to view details, hover for title

### Create Modal
- Clean form with all fields
- Dropdown homeowner selector
- Visibility toggle with explanation
- Guest email input (comma-separated)

### Homeowner Widget
- Card-style display
- Clock icon + appointment details
- Truncated descriptions (2 lines max)
- "No upcoming appointments" empty state

## ⚠️ Important Notes

1. **Email Invites**: Require `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` env vars
2. **Internal Events**: Won't email homeowner (guests still receive invites)
3. **Calendar Updates**: Use same title to update existing calendar event
4. **Visibility**: Only "shared_with_homeowner" appointments appear in homeowner portal
5. **Permissions**: Schedule tab only visible to admins (not builders or homeowners)

## 🔧 Troubleshooting

### Tab doesn't appear
- Check you're logged in as Admin (not Builder/Homeowner)
- Refresh page
- Check browser console for errors

### Calendar invites not sending
- Verify SendGrid API key is set
- Check SendGrid dashboard for delivery status
- Appointment still created even if email fails

### Events not showing
- Check date range (use Today button to reset)
- Verify homeowner is linked correctly
- Check visibility setting

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check server logs (`netlify dev`)
3. Verify database connection
4. Review `SCHEDULE-TAB-IMPLEMENTATION.md` for detailed architecture

---

**Estimated Setup Time**: 5 minutes  
**Ready for Production**: ✅ Yes  
**Last Updated**: January 3, 2026

