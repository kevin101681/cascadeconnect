# Quick Start: Adding PDF Reports App Integration

## Step 1: Update Environment Variables

Add to `.env.local`:
```env
VITE_REPORT_APP_API_URL=http://localhost:3001/api
VITE_REPORT_APP_URL=http://localhost:3001
VITE_REPORT_APP_API_KEY=your_api_key_here
```

## Step 2: Run Database Migration

```bash
npm run db:push
```

This adds the integration fields to the homeowners table.

## Step 3: Add Integration Component to UI

### Option A: Add to Homeowner Detail View (Dashboard)

In `components/Dashboard.tsx`, add the integration component:

```tsx
import ReportAppIntegration from './ReportAppIntegration';

// In the homeowner info section, add:
{isAdmin && targetHomeowner && (
  <div className="mt-6">
    <ReportAppIntegration 
      homeowner={targetHomeowner}
      onUpdateHomeowner={(updated) => {
        if (onUpdateHomeowner) {
          onUpdateHomeowner(updated);
        }
      }}
    />
  </div>
)}
```

### Option B: Add to Homeowner Enrollment/Edit Modal

In `components/HomeownerEnrollment.tsx` or wherever you edit homeowners:

```tsx
import ReportAppIntegration from './ReportAppIntegration';

// After the homeowner form, add:
{homeowner.id && (
  <ReportAppIntegration 
    homeowner={homeowner}
    onUpdateHomeowner={handleUpdateHomeowner}
  />
)}
```

## Step 4: Set Up Your PDF Reports App API

Your PDF Reports App needs these endpoints:

### Create User Endpoint
```javascript
// POST /api/users
app.post('/api/users', async (req, res) => {
  const { email, name, phone, address, builder, cascadeConnectHomeownerId } = req.body;
  
  // Create user in your database
  const user = await createUser({
    email,
    name,
    phone,
    address,
    builder,
    cascadeConnectHomeownerId,
  });
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    cascadeConnectHomeownerId: user.cascadeConnectHomeownerId,
    createdAt: user.createdAt,
  });
});
```

### Update User Endpoint
```javascript
// PUT /api/users/:userId
app.put('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const { email, name, phone, address, builder } = req.body;
  
  await updateUser(userId, { email, name, phone, address, builder });
  
  res.json({ success: true, message: 'User updated successfully' });
});
```

### Check Link Endpoint
```javascript
// GET /api/users/by-cascade-id/:homeownerId
app.get('/api/users/by-cascade-id/:homeownerId', async (req, res) => {
  const { homeownerId } = req.params;
  
  const user = await findUserByCascadeId(homeownerId);
  
  if (user) {
    res.json({
      id: user.id,
      email: user.email,
      cascadeConnectHomeownerId: user.cascadeConnectHomeownerId,
    });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});
```

## Step 5: Test the Integration

1. Start both apps
2. Navigate to a homeowner in Cascade Connect
3. Click "Link to PDF Reports App"
4. Verify the user is created in your PDF Reports App
5. Test "Sync Update" and "Open Reports"

## Troubleshooting

- **CORS errors**: Add CORS middleware to your PDF Reports App
- **API not found**: Check the API URL in environment variables
- **Authentication errors**: Verify API key or token setup

See `INTEGRATION-GUIDE.md` for detailed documentation.






