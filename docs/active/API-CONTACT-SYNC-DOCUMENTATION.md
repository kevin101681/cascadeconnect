# Contact Sync API Documentation

## Overview

RESTful API for mobile apps to sync contacts with the AI Gatekeeper system.

**Base URL**: `https://your-site.netlify.app/.netlify/functions/contact-sync`

**Authentication**: Clerk user ID in `Authorization` header

---

## Endpoints

### 1. Sync Contacts

Sync contacts from mobile app to database.

**Endpoint**: `POST /contact-sync`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <clerk_user_id>
```

**Request Body**:
```json
{
  "contacts": [
    {
      "name": "John Doe",
      "phone": "(555) 123-4567"
    },
    {
      "name": "Jane Smith",
      "phone": "+1-555-987-6543"
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully synced 2 contacts (0 failed)",
  "synced": 2,
  "failed": 0,
  "errors": []
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Bad Request",
  "message": "contacts array required"
}
```

**Example (JavaScript)**:
```javascript
const response = await fetch('https://your-site.netlify.app/.netlify/functions/contact-sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${clerkUserId}`
  },
  body: JSON.stringify({
    contacts: [
      { name: 'John Doe', phone: '(555) 123-4567' },
      { name: 'Jane Smith', phone: '555-987-6543' }
    ]
  })
});

const result = await response.json();
console.log(`Synced ${result.synced} contacts`);
```

---

### 2. List Contacts

Get all contacts for the authenticated user.

**Endpoint**: `GET /contact-sync`

**Headers**:
```
Authorization: Bearer <clerk_user_id>
```

**Response** (200 OK):
```json
{
  "contacts": [
    {
      "id": "uuid-1",
      "userId": "user_abc123",
      "phoneNumber": "+15551234567",
      "name": "John Doe",
      "createdAt": "2026-01-20T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "userId": "user_abc123",
      "phoneNumber": "+15559876543",
      "name": "Jane Smith",
      "createdAt": "2026-01-20T10:00:00Z"
    }
  ],
  "count": 2
}
```

**Example (JavaScript)**:
```javascript
const response = await fetch('https://your-site.netlify.app/.netlify/functions/contact-sync', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${clerkUserId}`
  }
});

const { contacts, count } = await response.json();
console.log(`User has ${count} contacts`);
```

---

### 3. Check Known Contact

Check if a specific phone number is in the user's contact list.

**Endpoint**: `GET /contact-sync?phone=<phone_number>`

**Headers**:
```
Authorization: Bearer <clerk_user_id>
```

**Query Parameters**:
- `phone` (required): Phone number to check (any format)

**Response** (200 OK):
```json
{
  "isKnown": true,
  "contact": {
    "id": "uuid-1",
    "userId": "user_abc123",
    "phoneNumber": "+15551234567",
    "name": "John Doe",
    "createdAt": "2026-01-20T10:00:00Z"
  }
}
```

**Response** (200 OK - Not Found):
```json
{
  "isKnown": false,
  "contact": null
}
```

**Example (JavaScript)**:
```javascript
const phone = '(555) 123-4567';
const response = await fetch(
  `https://your-site.netlify.app/.netlify/functions/contact-sync?phone=${encodeURIComponent(phone)}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${clerkUserId}`
    }
  }
);

const { isKnown, contact } = await response.json();
if (isKnown) {
  console.log(`Known contact: ${contact.name}`);
} else {
  console.log('Unknown contact');
}
```

---

### 4. Clear Contacts

Delete all contacts for the authenticated user.

**Endpoint**: `DELETE /contact-sync`

**Headers**:
```
Authorization: Bearer <clerk_user_id>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Deleted 2 contacts",
  "count": 2
}
```

**Example (JavaScript)**:
```javascript
const response = await fetch('https://your-site.netlify.app/.netlify/functions/contact-sync', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${clerkUserId}`
  }
});

const { count } = await response.json();
console.log(`Deleted ${count} contacts`);
```

---

## Authentication

### Clerk User ID

The API expects a Clerk user ID in the `Authorization` header:

```
Authorization: Bearer user_2abc123def456ghi789
```

Or direct Clerk ID (without "Bearer"):

```
Authorization: user_2abc123def456ghi789
```

### Getting Clerk User ID (React Native)

```javascript
import { useAuth } from '@clerk/clerk-react';

function MyComponent() {
  const { userId } = useAuth();
  
  // Use userId in API calls
  const syncContacts = async (contacts) => {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`
      },
      body: JSON.stringify({ contacts })
    });
    
    return response.json();
  };
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authorization header required (Clerk user ID)"
}
```

**Cause**: Missing or invalid `Authorization` header

**Fix**: Include valid Clerk user ID in `Authorization` header

---

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "contacts array required"
}
```

**Cause**: Invalid request body format

**Fix**: Ensure request body has `contacts` array with `name` and `phone` fields

---

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Database connection failed"
}
```

**Cause**: Server-side error (database, configuration, etc.)

**Fix**: Check server logs, verify environment variables

---

## Phone Number Formats

The API accepts any phone number format and automatically normalizes to E.164:

**Accepted Formats**:
- `(555) 123-4567` → `+15551234567`
- `555-123-4567` → `+15551234567`
- `555.123.4567` → `+15551234567`
- `5551234567` → `+15551234567`
- `+1 555 123 4567` → `+15551234567`
- `+15551234567` → `+15551234567` (already E.164)

**Invalid Formats**:
- Empty string
- Non-numeric (e.g., "abc")
- Too short (< 10 digits)

---

## Rate Limits

Currently no rate limits enforced. Consider implementing rate limiting for production:

- **Sync Contacts**: 10 requests/minute
- **List Contacts**: 60 requests/minute
- **Check Contact**: 60 requests/minute
- **Clear Contacts**: 5 requests/minute

---

## Mobile App Integration

### React Native Example

```javascript
import { useAuth } from '@clerk/clerk-react';
import * as Contacts from 'expo-contacts';

const API_BASE = 'https://your-site.netlify.app/.netlify/functions/contact-sync';

export function useContactSync() {
  const { userId } = useAuth();

  const syncContacts = async () => {
    // Get contacts from device
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Contact permission denied');
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });

    // Format for API
    const contacts = data
      .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
      .map(contact => ({
        name: contact.name || 'Unknown',
        phone: contact.phoneNumbers[0].number,
      }));

    // Sync to server
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
      body: JSON.stringify({ contacts }),
    });

    return response.json();
  };

  const listContacts = async () => {
    const response = await fetch(API_BASE, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userId}`,
      },
    });

    return response.json();
  };

  const clearContacts = async () => {
    const response = await fetch(API_BASE, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userId}`,
      },
    });

    return response.json();
  };

  return { syncContacts, listContacts, clearContacts };
}
```

### Usage in Component

```javascript
import React, { useState } from 'react';
import { View, Button, Text } from 'react-native';
import { useContactSync } from './hooks/useContactSync';

export function ContactSyncScreen() {
  const { syncContacts, listContacts, clearContacts } = useContactSync();
  const [status, setStatus] = useState('');

  const handleSync = async () => {
    setStatus('Syncing...');
    try {
      const result = await syncContacts();
      setStatus(`Synced ${result.synced} contacts (${result.failed} failed)`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleList = async () => {
    setStatus('Loading...');
    try {
      const { contacts, count } = await listContacts();
      setStatus(`You have ${count} contacts in the allowlist`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleClear = async () => {
    setStatus('Clearing...');
    try {
      const { count } = await clearContacts();
      setStatus(`Deleted ${count} contacts`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <View>
      <Button title="Sync Contacts" onPress={handleSync} />
      <Button title="List Contacts" onPress={handleList} />
      <Button title="Clear Contacts" onPress={handleClear} />
      <Text>{status}</Text>
    </View>
  );
}
```

---

## Testing

### Test with cURL

**Sync Contacts**:
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/contact-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer user_abc123" \
  -d '{
    "contacts": [
      {"name": "Test Contact", "phone": "555-123-4567"}
    ]
  }'
```

**List Contacts**:
```bash
curl -X GET https://your-site.netlify.app/.netlify/functions/contact-sync \
  -H "Authorization: Bearer user_abc123"
```

**Check Contact**:
```bash
curl -X GET "https://your-site.netlify.app/.netlify/functions/contact-sync?phone=555-123-4567" \
  -H "Authorization: Bearer user_abc123"
```

**Clear Contacts**:
```bash
curl -X DELETE https://your-site.netlify.app/.netlify/functions/contact-sync \
  -H "Authorization: Bearer user_abc123"
```

---

## Security Considerations

1. **Authentication**: Always required via Clerk user ID
2. **Phone Validation**: Invalid phone numbers are rejected
3. **User Isolation**: Users can only access their own contacts
4. **CORS**: Enabled for mobile app access
5. **Rate Limiting**: Consider implementing in production

---

## Support

For API issues or questions:
1. Check Netlify function logs
2. Verify authentication (Clerk user ID)
3. Test with cURL first
4. Review error messages

---

**Last Updated**: 2026-01-20  
**API Version**: 1.0.0  
**Status**: ✅ Production Ready
