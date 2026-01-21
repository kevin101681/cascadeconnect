# SendGrid Setup Guide for Automatic Email Reply Handling

This guide will help you set up SendGrid to enable automatic email reply handling in Cascade Connect.

## Why SendGrid?

SendGrid provides:
- **Inbound Parse Webhook**: Automatically receives and parses incoming emails
- **High Deliverability**: Industry-leading email delivery rates
- **Easy Integration**: Simple API and webhook setup
- **Free Tier**: 100 emails/day free, then pay-as-you-go

## Step 1: Create SendGrid Account

1. Go to https://sendgrid.com and sign up for a free account
2. Verify your email address
3. Complete the account setup

## Step 2: Create API Key

1. Go to **Settings** → **API Keys** in SendGrid dashboard
2. Click **Create API Key**
3. Name it: `Cascade Connect Email`
4. Select **Full Access** (or **Restricted Access** with Mail Send permissions)
5. Copy the API key (you won't be able to see it again!)

## Step 3: Set Up Inbound Parse (For Email Replies)

1. Go to **Settings** → **Inbound Parse** in SendGrid dashboard
2. Click **Add Host & URL**
3. Configure:
   - **Subdomain**: Choose a subdomain (e.g., `replies`) - this will be `replies@yourdomain.com`
   - **Domain**: Your domain (e.g., `cascadeconnect.com`)
   - **Destination URL**: `https://cascadeconnect.netlify.app/api/email/inbound`
   - **Check "POST the raw, full MIME message"**: ✅ (recommended)
   - **Check "Check incoming emails for spam"**: ✅ (recommended)
4. Click **Add**
5. **Important**: SendGrid will provide MX records you need to add to your domain's DNS settings

## Step 4: Configure DNS Records

1. Go to your domain registrar (where you bought your domain)
2. Add the MX records provided by SendGrid
   - These tell email servers where to send emails for your domain
   - Example:
     ```
     Type: MX
     Host: @ (or your subdomain)
     Value: mx.sendgrid.net
     Priority: 10
     ```
3. Wait for DNS propagation (can take up to 48 hours, usually much faster)

## Step 5: Set Environment Variables in Netlify

1. Go to **Netlify Dashboard** → **Your Site** → **Site Settings** → **Environment Variables**
2. Add:
   - `SENDGRID_API_KEY` = Your SendGrid API key from Step 2
   - `SENDGRID_REPLY_EMAIL` = The email address that will receive replies (e.g., `replies@yourdomain.com`)
3. **Optional** (if you want to keep SMTP as fallback):
   - Keep your existing `SMTP_*` variables

## Step 6: Verify Setup

1. Send a test email from the app to a homeowner
2. Have the homeowner reply to that email
3. Check the Netlify Function logs:
   - Go to **Netlify Dashboard** → **Your Site** → **Functions** → **email-inbound**
   - You should see logs when the reply is received
4. The reply should automatically appear in the Cascade Connect messaging system

## How It Works

1. **Sending Emails**:
   - When an internal user sends a message, it's sent via SendGrid
   - The email includes a custom header `X-Thread-ID` with the message thread ID
   - The `Reply-To` address is set to your `SENDGRID_REPLY_EMAIL`

2. **Receiving Replies**:
   - When a homeowner replies via their email client (Outlook, Gmail, etc.)
   - The reply goes to `replies@yourdomain.com`
   - SendGrid's Inbound Parse receives it and forwards to your webhook
   - The webhook extracts the thread ID and creates a message in the app

## Troubleshooting

### Emails not being received
- Check DNS MX records are correctly configured
- Verify DNS propagation: https://mxtoolbox.com/
- Check SendGrid Inbound Parse settings

### Replies not appearing in app
- Check Netlify Function logs for errors
- Verify `SENDGRID_API_KEY` and `SENDGRID_REPLY_EMAIL` are set
- Check that the webhook URL is correct in SendGrid settings

### Still using SMTP?
- The system will automatically use SendGrid if `SENDGRID_API_KEY` is set
- If not set, it falls back to SMTP configuration
- You can use both - SendGrid for sending, SMTP as backup

## Alternative: Using a Subdomain

If you don't want to modify your main domain's MX records, you can:
1. Use a subdomain like `mail.cascadeconnect.com`
2. Set up MX records only for that subdomain
3. Use `replies@mail.cascadeconnect.com` as your reply email

## Cost

- **Free Tier**: 100 emails/day
- **Essentials Plan**: $19.95/month for 50,000 emails
- **Pro Plan**: $89.95/month for 100,000 emails
- Pay-as-you-go pricing available

For most warranty management use cases, the free tier or Essentials plan should be sufficient.


