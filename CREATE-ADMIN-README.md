# Create Admin Account

This guide explains how to create an admin account for the Cascade Connect app.

## Prerequisites

1. **Database Connection**: Make sure your `DATABASE_URL` or `VITE_DATABASE_URL` is set in your `.env.local` file
2. **Clerk Account**: The admin user needs to have a Clerk account with the email you specify

## How It Works

The app uses Clerk for authentication and matches users by email address. When you create an admin account:

1. A record is created in the database `users` table with `role: 'ADMIN'`
2. When the user signs in via Clerk with the matching email, the app automatically grants them admin access
3. The Clerk User ID can be linked later if needed

## Creating an Admin Account

### Option 1: Using npm script (Recommended)

```bash
npm run create-admin
```

### Option 2: Using tsx directly

```bash
npx tsx scripts/create-admin.ts
```

### Option 3: With environment variable

```bash
DATABASE_URL=your_database_url npm run create-admin
```

## What You'll Need

The script will prompt you for:
- **Admin Name**: Full name of the admin user
- **Admin Email**: Email address (must match the Clerk account email)
- **Clerk User ID** (optional): Can be added later if needed

## Example

```bash
$ npm run create-admin

🔐 Create Admin Account

This script will create an admin user in the database.
The user will need to sign up/sign in via Clerk with the email you provide.

Admin Name: John Doe
Admin Email (must match Clerk account): john@example.com
Clerk User ID (optional, can be added later): 

⏳ Creating admin account...
✅ Admin account created successfully!

📋 Account Details:
   Name: John Doe
   Email: john@example.com
   Role: ADMIN
   Clerk ID: (not set - user will be matched by email when they sign in)

💡 Next Steps:
   1. Make sure the user signs up/signs in via Clerk with this email
   2. The app will automatically match the Clerk account to this admin user
   3. If you need to link a Clerk ID later, you can update the user in the database
```

## Updating Existing Users

If a user with the email already exists, the script will ask if you want to update them to ADMIN role.

## Troubleshooting

### Error: DATABASE_URL not found
- Make sure you have a `.env.local` file with `DATABASE_URL` or `VITE_DATABASE_URL` set
- Or pass it as an environment variable: `DATABASE_URL=your_url npm run create-admin`

### Error: Email already in use
- The email is already registered in the database
- Choose to update the existing user to ADMIN role, or use a different email

### User can't access admin features
- Make sure the user has signed in via Clerk with the exact email you used
- Check that the user record in the database has `role: 'ADMIN'`
- Verify the email matches exactly (case-insensitive, but must match)

## Notes

- Passwords are handled by Clerk, not stored in the database
- The Clerk User ID is optional - users are matched by email if not provided
- Admin users have access to all features including user management, claim management, and system settings

