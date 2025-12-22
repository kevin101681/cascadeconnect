# Email Notification Triggers

This document lists all actions in the Cascade Connect application that trigger email notifications to be sent.

## 1. Claim-Related Email Notifications

### 1.1 New Claim Submitted
- **Trigger**: When a homeowner submits a new warranty claim
- **Recipients**: All admin users who have `emailNotifyClaimSubmitted` enabled (default: true)
- **Subject**: `New Claim Submitted: [Claim Number] - [Claim Title]`
- **Location**: `App.tsx` - `handleCreateClaim()` function (lines ~1372-1410)
- **User Preference**: `emailNotifyClaimSubmitted` (can be toggled in Internal User Management)

### 1.2 Appointment Scheduled by Admin/Builder
- **Trigger**: When an admin or builder schedules an appointment date for a claim
- **Recipients**: The homeowner associated with the claim
- **Subject**: `Appointment Scheduled: [Claim Number] - [Claim Title]`
- **Location**: `App.tsx` - `handleUpdateClaim()` function (lines ~1070-1096)
- **Note**: Sent automatically when admin sets a proposed date status to 'ACCEPTED'

### 1.3 Homeowner Accepts Appointment Date
- **Trigger**: When a homeowner accepts a proposed appointment date
- **Recipients**: All admin users who have `emailNotifyHomeownerAcceptsAppointment` enabled (default: true)
- **Subject**: `Appointment Accepted: [Claim Number] - [Claim Title]`
- **Location**: `App.tsx` - `handleUpdateClaim()` function (lines ~1097-1125)
- **User Preference**: `emailNotifyHomeownerAcceptsAppointment` (can be toggled in Internal User Management)

### 1.4 Subcontractor Accepts Appointment Date
- **Trigger**: When a subcontractor accepts an appointment date from their account
- **Recipients**: 
  - All admin users who have `emailNotifySubAcceptsAppointment` enabled (default: true)
  - The homeowner associated with the claim
- **Subject**: 
  - Admins: `Sub Accepted Appointment: [Claim Number] - [Claim Title]`
  - Homeowner: `Sub Accepted Appointment: [Claim Number] - [Claim Title]`
- **Location**: `App.tsx` - `handleUpdateClaim()` function (lines ~1126-1185)
- **User Preference**: `emailNotifySubAcceptsAppointment` (can be toggled in Internal User Management)

### 1.5 Homeowner Requests Reschedule
- **Trigger**: When a homeowner requests to reschedule an appointment
- **Recipients**: All admin users who have `emailNotifyHomeownerRescheduleRequest` enabled (default: true)
- **Subject**: `Reschedule Requested: [Claim Number] - [Claim Title]`
- **Location**: `App.tsx` - `handleUpdateClaim()` function (lines ~1186-1220)
- **User Preference**: `emailNotifyHomeownerRescheduleRequest` (can be toggled in Internal User Management)

## 2. Task-Related Email Notifications

### 2.1 New Task Assigned
- **Trigger**: When a new task is created and assigned to a user
- **Recipients**: The assigned employee (if they have `emailNotifyTaskAssigned` enabled, default: true)
- **Subject**: `New Task Assigned: [Task Title]`
- **Location**: `App.tsx` - `handleAddTask()` function (lines ~2301-2335)
- **User Preference**: `emailNotifyTaskAssigned` (can be toggled in Internal User Management)

## 3. Message-Related Email Notifications

### 3.1 Homeowner Sends a Message (Reply)
- **Trigger**: When a homeowner replies to an existing message thread
- **Recipients**: All participants in the thread (admin users who are on the thread)
- **Subject**: `Re: [Thread Subject]`
- **Location**: `components/Dashboard.tsx` - `handleSendMessage()` function (lines ~1313-1326)
- **Note**: Users always receive email notifications when a homeowner sends a message if they are on the thread (no preference toggle - always enabled)

### 3.2 Admin Sends a New Message
- **Trigger**: When an admin creates a new message thread to a homeowner
- **Recipients**: The homeowner
- **Subject**: [Message Subject]
- **Location**: `components/Dashboard.tsx` - `handleCreateNewMessage()` function (lines ~1372-1383)
- **Note**: Sent when admin initiates a new conversation with a homeowner

### 3.3 Inbound Email Reply (via SendGrid Webhook)
- **Trigger**: When a homeowner replies to an email via their email client (inbound email processing)
- **Recipients**: The original admin sender who initiated the thread
- **Subject**: `Re: [Original Subject]`
- **Location**: `netlify/functions/email-inbound.js` (lines ~248-424)
- **Note**: Handles email replies that come through the SendGrid inbound webhook

## 4. Homeowner Enrollment Email Notifications

### 4.1 New Homeowner Enrollment
- **Trigger**: When a new homeowner is enrolled in the system
- **Recipients**: Administrator (first admin user found in the system)
- **Subject**: `New Homeowner Enrollment: [Homeowner Name]`
- **Location**: `App.tsx` - `handleEnrollHomeowner()` function (lines ~1685-1863)
- **Note**: Always sent to admin, no preference toggle

## 5. Invitation Emails

### 5.1 Homeowner Invitation Email
- **Trigger**: When an admin sends an invitation email to a homeowner (via "Send Invite" button)
- **Recipients**: The homeowner
- **Subject**: `A Warm Welcome to Your New Home, [Name]! Important Information from Cascade Builder Services`
- **Location**: 
  - `components/Dashboard.tsx` - `handleSendInvite()` function (lines ~1249-1262)
  - `components/Dashboard.tsx` - Homeowner edit form (lines ~1064-1076)
- **Note**: Uses AI-generated content via Gemini service (`draftInviteEmail()`)

## Email Notification Preferences

All email notification preferences can be managed in the **Internal User Management** interface:

- ✅ `emailNotifyClaimSubmitted` - Homeowner submits a claim
- ✅ `emailNotifyHomeownerAcceptsAppointment` - Homeowner accepts an appointment date
- ✅ `emailNotifySubAcceptsAppointment` - Sub accepts an appointment date
- ✅ `emailNotifyHomeownerRescheduleRequest` - Homeowner requests a reschedule
- ✅ `emailNotifyTaskAssigned` - New task assigned to user

**Note**: Message notifications (when homeowner sends a message) are always enabled and cannot be disabled - users on a thread will always receive email notifications.

## Email Service Configuration

Emails are sent via:
- **SendGrid** (if `SENDGRID_API_KEY` is configured)
- **SMTP** (if SMTP credentials are configured)
- **Simulation mode** (if neither is configured - logs to console)

Email service implementation: `services/emailService.ts`
Email API endpoint: `/api/email/send` (Netlify function or local server)

