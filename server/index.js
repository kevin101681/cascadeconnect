
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./uploadthing.js";
import cbsbooksRouter from "./cbsbooks.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// UploadThing Route Handler
const uploadthingHandler = createRouteHandler({
  router: uploadRouter,
  config: { 
      uploadthingId: process.env.UPLOADTHING_APP_ID,
      uploadthingSecret: process.env.UPLOADTHING_SECRET,
  },
});

app.use("/api/uploadthing", uploadthingHandler);

// CBS Books API Routes
app.use("/api/cbsbooks", cbsbooksRouter);

// Email API Route - Supports both SendGrid and SMTP
app.post("/api/email/send", async (req, res) => {
  const { to, subject, body, fromName, fromRole, replyToId } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ 
      error: "Missing required fields: 'to', 'subject', and 'body' are required." 
    });
  }

  try {
    // Format email body
    const htmlBody = body.replace(/\n/g, '<br>');
    const textBody = body;
    const fromEmail = process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;

    // Prefer SendGrid if API key is available
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = (await import('@sendgrid/mail')).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      // Create a message ID that includes the thread ID for reply matching
      const messageId = replyToId 
        ? `${replyToId}@${new URL(process.env.SENDGRID_REPLY_EMAIL || 'cascadeconnect.netlify.app').hostname || 'cascadeconnect.netlify.app'}`
        : undefined;

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
        }
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
        }
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
// Note: UploadThing handles its own errors, but this catches any unhandled errors
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  if (req.path.startsWith('/api/uploadthing')) {
    res.status(500).json({ 
      error: "Upload failed", 
      message: err.message || "Internal server error",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } else {
    res.status(500).json({ 
      error: "Server error", 
      message: err.message || "Internal server error"
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "CASCADE CONNECT Backend is running",
    uploadthingConfigured: !!(process.env.UPLOADTHING_APP_ID && process.env.UPLOADTHING_SECRET)
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`UploadThing endpoint active at http://localhost:${PORT}/api/uploadthing`);
  console.log(`Email endpoint active at http://localhost:${PORT}/api/email/send`);
  
  // Check if UploadThing credentials are set
  if (!process.env.UPLOADTHING_APP_ID || !process.env.UPLOADTHING_SECRET) {
    console.warn("⚠️  WARNING: UPLOADTHING_APP_ID or UPLOADTHING_SECRET not set!");
    console.warn("   Uploads will fail. Set these in your .env.local file.");
  } else {
    console.log("✅ UploadThing credentials configured");
  }
  
  // Check if SMTP credentials are set
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️  WARNING: SMTP configuration not set!");
    console.warn("   Email sending will fail. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env.local file.");
  } else {
    console.log("✅ SMTP email configuration configured");
  }
});
