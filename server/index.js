
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import cbsbooksRouter from "./cbsbooks.js";
import { uploadMiddleware, uploadToCloudinary } from "./cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local first, then .env
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: resolve(__dirname, '..', '.env') });
dotenv.config(); // Also load default .env as fallback

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true, // Allow credentials (cookies, etc.)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Better Auth API routes - MUST be before express.json() middleware
// Using toNodeHandler for proper Express integration
app.all("/api/auth/*", toNodeHandler(auth));

// Express JSON middleware - mount after Better Auth handler
// This prevents Better Auth from hanging on pending requests
app.use(express.json());

// CBS Books API Routes
app.use("/api/cbsbooks", cbsbooksRouter);

// Cloudinary upload endpoint
app.post("/api/upload", (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ 
        error: 'File upload error', 
        message: err.message 
      });
    }
    next();
  });
}, async (req, res) => {
  // Add timeout to prevent hanging requests
  req.setTimeout(60000); // 60 second timeout
  try {
    // Check if Cloudinary is configured (support both prefixed and non-prefixed variants)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;
    
    // Debug logging
    console.log('Environment check:', {
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      cloudNameSource: cloudName ? (process.env.CLOUDINARY_CLOUD_NAME ? 'CLOUDINARY_CLOUD_NAME' : 'VITE_CLOUDINARY_CLOUD_NAME') : 'none',
      apiKeySource: apiKey ? (process.env.CLOUDINARY_API_KEY ? 'CLOUDINARY_API_KEY' : 'VITE_CLOUDINARY_API_KEY') : 'none',
      apiSecretSource: apiSecret ? (process.env.CLOUDINARY_API_SECRET ? 'CLOUDINARY_API_SECRET' : 'VITE_CLOUDINARY_API_SECRET') : 'none',
    });
    
    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary configuration missing!');
      console.error('Available env vars with CLOUDINARY:', Object.keys(process.env).filter(k => k.includes('CLOUDINARY')));
      return res.status(500).json({ 
        error: 'Upload service not configured', 
        message: 'Cloudinary credentials are missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env.local file (or their VITE_ prefixed variants).' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('Uploading file to Cloudinary:', {
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const result = await uploadToCloudinary(req.file, 'warranty-claims');
    
    // Determine file type
    let fileType = 'DOCUMENT';
    if (result.resourceType === 'image') {
      fileType = 'IMAGE';
    } else if (result.resourceType === 'video') {
      fileType = 'VIDEO';
    }

    console.log('✅ File uploaded successfully:', result.url);

    res.json({
      success: true,
      url: result.url,
      publicId: result.publicId,
      type: fileType,
      name: req.file.originalname,
      size: result.bytes,
    });
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Make sure we always send a response, even if there's an error
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Upload failed', 
        message: error.message || 'Unknown error occurred during upload',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      console.error('Response already sent, cannot send error response');
    }
  }
});

// Email API Route - Supports both SendGrid and SMTP
app.post("/api/email/send", async (req, res) => {
  const { to, subject, body, fromName, fromRole, replyToId, attachments } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ 
      error: "Missing required fields: 'to', 'subject', and 'body' are required." 
    });
  }

  try {
    // Format email body - check if it already contains HTML
    const containsHTML = /<[a-z][\s\S]*>/i.test(body);
    const htmlBody = containsHTML ? body : body.replace(/\n/g, '<br>');
    // For text version, strip HTML tags if present
    const textBody = containsHTML ? body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : body;
    const fromEmail = process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;

    // Prefer SendGrid if API key is available
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = (await import('@sendgrid/mail')).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      // Create a message ID that includes the thread ID for reply matching
      const messageId = replyToId 
        ? `${replyToId}@${new URL(process.env.SENDGRID_REPLY_EMAIL || 'cascadeconnect.netlify.app').hostname || 'cascadeconnect.netlify.app'}`
        : undefined;

      // Prepare attachments for SendGrid
      const sendGridAttachments = attachments && attachments.length > 0
        ? attachments.map(att => ({
            content: att.content,
            filename: att.filename,
            type: att.contentType || 'application/octet-stream',
            disposition: 'attachment'
          }))
        : [];

      const msg = {
        to: to,
        from: {
          email: fromEmail,
          name: fromName || 'Cascade Connect'
        },
        subject: subject,
        text: textBody,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            ${htmlBody}
            ${replyToId ? `<hr style="margin-top: 20px; border: none; border-top: 1px solid #ddd;"><p style="font-size: 12px; color: #666;">Reply-To ID: ${replyToId}</p>` : ''}
          </div>
        `,
        replyTo: fromEmail,
        // Add custom header with thread ID for reply matching
        headers: {
          'X-Thread-ID': replyToId || '',
          'In-Reply-To': messageId,
          'References': messageId
        },
        // Custom args for SendGrid webhooks
        customArgs: {
          threadId: replyToId || ''
        },
        attachments: sendGridAttachments
      };

      const [response] = await sgMail.send(msg);
      console.log('✅ Email sent via SendGrid:', response.statusCode);
      res.json({ 
        success: true, 
        messageId: response.headers['x-message-id'],
        message: 'Email sent successfully via SendGrid' 
      });
    } 
    // Fall back to SMTP
    else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Create message ID with thread ID embedded
      const messageId = replyToId 
        ? `${replyToId}@${new URL(process.env.SMTP_FROM || 'localhost').hostname || 'localhost'}`
        : undefined;

      // Prepare attachments for SMTP
      const smtpAttachments = attachments && attachments.length > 0
        ? attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            encoding: 'base64',
            contentType: att.contentType || 'application/octet-stream'
          }))
        : [];

      const mailOptions = {
        from: `${fromName || 'Cascade Connect'} <${fromEmail}>`,
        to: to,
        subject: subject,
        text: textBody,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            ${htmlBody}
            ${replyToId ? `<hr style="margin-top: 20px; border: none; border-top: 1px solid #ddd;"><p style="font-size: 12px; color: #666;">Reply-To ID: ${replyToId}</p>` : ''}
          </div>
        `,
        replyTo: fromEmail,
        headers: {
          'X-Thread-ID': replyToId || '',
          'In-Reply-To': messageId,
          'References': messageId
        },
        attachments: smtpAttachments
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent via SMTP:', info.messageId);
      res.json({ 
        success: true, 
        messageId: info.messageId,
        message: 'Email sent successfully via SMTP' 
      });
    } else {
      return res.status(500).json({ 
        error: "Email configuration missing. Please set SENDGRID_API_KEY or SMTP credentials." 
      });
    }
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error);
    res.status(500).json({ 
      error: error.message || "Failed to send email",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Email Analytics API - Fetches email statistics from SendGrid
app.get("/api/email/analytics", async (req, res) => {
  try {
    console.log('📊 Email Analytics API called');
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      console.error('❌ SendGrid API key not found in environment variables');
      console.log('Available env vars with SENDGRID:', Object.keys(process.env).filter(k => k.includes('SENDGRID')));
      return res.status(500).json({ 
        error: "SendGrid API key not configured",
        message: "Please set SENDGRID_API_KEY in your .env.local file"
      });
    }
    
    console.log('✅ SendGrid API key found');

    // Get query parameters for date range
    const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default: 30 days ago
    const endDate = req.query.end_date || new Date().toISOString().split('T')[0]; // Default: today
    const aggregatedBy = req.query.aggregated_by || 'day'; // day, week, or month

    // Fetch email statistics using SendGrid REST API
    const statsUrl = new URL('https://api.sendgrid.com/v3/stats');
    statsUrl.searchParams.set('start_date', startDate);
    statsUrl.searchParams.set('end_date', endDate);
    statsUrl.searchParams.set('aggregated_by', aggregatedBy);

    const statsResponse = await fetch(statsUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      throw new Error(`SendGrid stats API error: ${statsResponse.status} - ${errorText}`);
    }

    const statsData = await statsResponse.json();

    // Fetch recent email activity using SendGrid Messages API
    let activityData = [];
    try {
      const activityUrl = new URL('https://api.sendgrid.com/v3/messages');
      const limit = req.query.limit ? parseInt(req.query.limit) : 500; // Increased default limit
      activityUrl.searchParams.set('limit', limit.toString());
      
      // Try fetching recent messages - SendGrid Messages API query syntax may vary
      // Attempt query with date range first
      try {
        const queryValue = `last_event_time BETWEEN "${startDate}T00:00:00Z" AND "${endDate}T23:59:59Z"`;
        activityUrl.searchParams.set('query', queryValue);
        console.log('Fetching SendGrid messages with query:', queryValue);
      } catch (e) {
        console.warn('Could not set query parameter, fetching all recent messages');
      }
      
      console.log('Full URL:', activityUrl.toString());
      
      const activityResponse = await fetch(activityUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('SendGrid Messages API response status:', activityResponse.status);

      if (activityResponse.ok) {
        const activityResult = await activityResponse.json();
        console.log(`SendGrid Messages API returned ${activityResult.messages?.length || 0} messages`);
        console.log('Activity result keys:', Object.keys(activityResult));
        const messages = activityResult.messages || [];
        
        // Filter messages by date range if query didn't work
        const filteredMessages = messages.filter(msg => {
          const msgDate = msg.last_event_time || msg.sent_at;
          if (!msgDate) return false;
          const msgTimestamp = new Date(msgDate).getTime();
          const startTimestamp = new Date(`${startDate}T00:00:00Z`).getTime();
          const endTimestamp = new Date(`${endDate}T23:59:59Z`).getTime();
          return msgTimestamp >= startTimestamp && msgTimestamp <= endTimestamp;
        });
        
        console.log(`Filtered to ${filteredMessages.length} messages within date range`);
        const messagesToProcess = filteredMessages;
        
        // Process messages and fetch detailed activity for each
        // Note: SendGrid API rate limit is 6 requests per minute, so we process in batches
        const batchSize = 50;
        const finalMessagesToProcess = messagesToProcess.slice(0, Math.min(limit, 200)); // Limit to 200 max to avoid too many API calls
        console.log(`Processing ${finalMessagesToProcess.length} messages in detail`);
        for (const msg of finalMessagesToProcess) {
          try {
            // Get opens for this message
            let opens = [];
            try {
              const opensUrl = new URL(`https://api.sendgrid.com/v3/messages/${msg.msg_id}/opens`);
              const opensResponse = await fetch(opensUrl.toString(), {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                }
              });
              if (opensResponse.ok) {
                const opensData = await opensResponse.json();
                opens = (opensData.opens || []).map((o) => ({
                  email: o.email || 'Unknown',
                  timestamp: o.timestamp,
                  ip: o.ip || 'N/A',
                  user_agent: o.user_agent || 'N/A'
                }));
              }
            } catch (e) {
              console.warn(`Could not fetch opens for message ${msg.msg_id}:`, e.message);
            }

            // Get clicks for this message
            let clicks = [];
            try {
              const clicksUrl = new URL(`https://api.sendgrid.com/v3/messages/${msg.msg_id}/clicks`);
              const clicksResponse = await fetch(clicksUrl.toString(), {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                }
              });
              if (clicksResponse.ok) {
                const clicksData = await clicksResponse.json();
                clicks = (clicksData.clicks || []).map((c) => ({
                  email: c.email || 'Unknown',
                  timestamp: c.timestamp,
                  url: c.url || 'N/A',
                  ip: c.ip || 'N/A',
                  user_agent: c.user_agent || 'N/A'
                }));
              }
            } catch (e) {
              console.warn(`Could not fetch clicks for message ${msg.msg_id}:`, e.message);
            }

            // Extract recipient emails from the 'to' field
            let recipients = [];
            if (msg.to) {
              if (Array.isArray(msg.to)) {
                recipients = msg.to.map((r) => typeof r === 'string' ? r : r.email || r);
              } else if (typeof msg.to === 'string') {
                recipients = [msg.to];
              }
            }

            activityData.push({
              msg_id: msg.msg_id,
              from: msg.from?.email || 'Unknown',
              from_name: msg.from?.name || '',
              subject: msg.subject || 'No subject',
              to: recipients,
              status: msg.status || 'unknown',
              sent_at: msg.last_event_time || msg.sent_at,
              last_event_time: msg.last_event_time || msg.sent_at,
              opens_count: opens.length || msg.opens_count || 0,
              clicks_count: clicks.length || msg.clicks_count || 0,
              opens: opens,
              clicks: clicks
            });
          } catch (error) {
            console.warn(`Error processing message ${msg.msg_id}:`, error.message);
            // Fallback to basic message data
            activityData.push({
              msg_id: msg.msg_id,
              from: msg.from?.email || 'Unknown',
              from_name: msg.from?.name || '',
              subject: msg.subject || 'No subject',
              to: Array.isArray(msg.to) ? msg.to.map((r) => typeof r === 'string' ? r : r.email || r) : (msg.to ? [msg.to] : []),
              status: msg.status || 'unknown',
              sent_at: msg.last_event_time || msg.sent_at,
              last_event_time: msg.last_event_time || msg.sent_at,
              opens_count: msg.opens_count || 0,
              clicks_count: msg.clicks_count || 0,
              opens: [],
              clicks: []
            });
          }
        }
        console.log(`Processed ${activityData.length} activity records`);
      } else {
        const errorText = await activityResponse.text();
        console.warn('Could not fetch email activity:', activityResponse.status, errorText);
      }
    } catch (activityError) {
      console.warn('Could not fetch email activity:', activityError.message);
      // Continue without activity data
    }

    // Process statistics
    const processedStats = (statsData || []).map(stat => ({
      date: stat.date,
      stats: stat.stats.map(s => ({
        metrics: {
          blocks: s.metrics?.blocks || 0,
          bounce_drops: s.metrics?.bounce_drops || 0,
          bounces: s.metrics?.bounces || 0,
          clicks: s.metrics?.clicks || 0,
          deferred: s.metrics?.deferred || 0,
          delivered: s.metrics?.delivered || 0,
          invalid_emails: s.metrics?.invalid_emails || 0,
          opens: s.metrics?.opens || 0,
          processed: s.metrics?.processed || 0,
          requests: s.metrics?.requests || 0,
          spam_report_drops: s.metrics?.spam_report_drops || 0,
          spam_reports: s.metrics?.spam_reports || 0,
          unique_clicks: s.metrics?.unique_clicks || 0,
          unique_opens: s.metrics?.unique_opens || 0,
          unsubscribe_drops: s.metrics?.unsubscribe_drops || 0,
          unsubscribes: s.metrics?.unsubscribes || 0
        }
      }))
    }));

    // Calculate totals
    const totals = processedStats.reduce((acc, stat) => {
      stat.stats.forEach(s => {
        Object.keys(s.metrics).forEach(key => {
          acc[key] = (acc[key] || 0) + s.metrics[key];
        });
      });
      return acc;
    }, {});

    // Process activity data (already processed above with detailed info)
    const processedActivity = activityData.map(msg => ({
      msg_id: msg.msg_id,
      from: msg.from || 'Unknown',
      from_name: msg.from_name || '',
      subject: msg.subject || 'No subject',
      to: Array.isArray(msg.to) ? msg.to : (msg.to ? [msg.to] : []),
      status: msg.status || 'unknown',
      sent_at: msg.sent_at || msg.last_event_time,
      opens_count: msg.opens?.length || msg.opens_count || 0,
      clicks_count: msg.clicks?.length || msg.clicks_count || 0,
      opens: msg.opens || [],
      clicks: msg.clicks || [],
      last_event_time: msg.sent_at || msg.last_event_time
    }));

    res.json({
      success: true,
      dateRange: {
        start: startDate,
        end: endDate
      },
      aggregatedBy,
      stats: processedStats,
      totals,
      activity: processedActivity,
      activityCount: processedActivity.length
    });
  } catch (error) {
    console.error("EMAIL ANALYTICS ERROR:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    res.status(500).json({ 
      error: error.message || "Failed to fetch email analytics"
    });
  }
});

// Inbound Email Webhook - Receives emails from SendGrid Inbound Parse
app.post("/api/email/inbound", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    // SendGrid sends form-urlencoded data
    const emailData = req.body;
    
    const fromEmail = emailData.from || emailData.envelope || '';
    const subject = emailData.subject || '';
    const textBody = emailData.text || '';
    const htmlBody = emailData.html || '';
    const toEmail = emailData.to || '';
    
    // Extract thread ID from headers or body
    let threadId = null;
    
    // Check custom header
    const headers = emailData.headers || '';
    if (headers) {
      const headerMatch = headers.match(/X-Thread-ID:\s*([a-f0-9-]+)/i);
      if (headerMatch) {
        threadId = headerMatch[1];
      }
    }
    
    // Check In-Reply-To or References
    const inReplyTo = emailData['in-reply-to'] || emailData.references || '';
    if (inReplyTo && !threadId) {
      const threadMatch = inReplyTo.match(/<([a-f0-9-]+)@/);
      if (threadMatch) {
        threadId = threadMatch[1];
      }
    }
    
    // Fallback: parse from body
    if (!threadId && (textBody || htmlBody)) {
      const body = textBody || htmlBody.replace(/<[^>]*>/g, '');
      const footerMatch = body.match(/Reply-To ID:\s*([a-f0-9-]+)/i);
      if (footerMatch) {
        threadId = footerMatch[1];
      }
    }

    console.log('📧 Inbound email received:', {
      from: fromEmail,
      to: toEmail,
      subject: subject,
      threadId: threadId
    });

    // TODO: Process the email and create message in the app
    // This requires database access and message creation logic
    // For now, we'll return success
    
    res.json({ 
      success: true,
      message: 'Email received',
      threadId: threadId,
      from: fromEmail
    });
  } catch (error) {
    console.error('❌ Error processing inbound email:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process inbound email'
    });
  }
});

// Error handling middleware (must be after routes)
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ 
    error: "Server error", 
    message: err.message || "Internal server error"
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "CASCADE CONNECT Backend is running"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Email endpoint active at http://localhost:${PORT}/api/email/send`);
  console.log(`Email analytics endpoint active at http://localhost:${PORT}/api/email/analytics`);
  
  // Check if SMTP credentials are set
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️  WARNING: SMTP configuration not set!");
    console.warn("   Email sending will fail. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env.local file.");
  } else {
    console.log("✅ SMTP email configuration configured");
  }
});
