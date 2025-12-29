// Netlify Function to handle inbound emails from SendGrid
// This webhook receives parsed emails when someone replies to a message

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Helper to get database connection
const getDbClient = async () => {
  let connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

  if (!connectionString) {
    throw new Error("Database configuration is missing. Please set NETLIFY_DATABASE_URL, DATABASE_URL, or VITE_DATABASE_URL in Netlify environment variables.");
  }
  
  // Strip query parameters
  if (connectionString.includes('?')) {
    connectionString = connectionString.split('?')[0];
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  return client;
};

// Extract email address from various formats
const extractEmail = (emailString) => {
  if (!emailString) return null;
  // Handle formats like "Name <email@domain.com>" or just "email@domain.com"
  const match = emailString.match(/<([^>]+)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1].toLowerCase().trim() : emailString.toLowerCase().trim();
};

exports.handler = async (event, context) => {
  console.log('🔔 WEBHOOK CALLED - email-inbound.js');
  console.log('📧 Method:', event.httpMethod);
  console.log('📧 Headers:', JSON.stringify(event.headers, null, 2));
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.log('❌ Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let client = null;
  try {
    console.log('📧 Parsing email data...');
    
    try {
      console.log('Step A: Checking headers...');
      const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
      console.log('Step B: Content-Type =', contentType);
      
      console.log('Step C: Checking body...');
      const bodyExists = !!event.body;
      const bodyLength = event.body ? event.body.length : 0;
      console.log('Step D: Body exists?', bodyExists, 'Length:', bodyLength);
      
      console.log('Step E: Checking isBase64Encoded...');
      const isBase64 = event.isBase64Encoded || false;
      console.log('Step F: Is base64?', isBase64);
      
      console.log('Step G: Starting to parse multipart...');
    } catch (logError) {
      console.error('❌ Error in initial logging:', logError.message);
    }
    
    // Parse multipart/form-data manually (simpler than busboy)
    let emailData = {};
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    
    console.log('Step H: Checking content type:', contentType);
    
    if (contentType.includes('multipart/form-data')) {
      console.log('Step I: Is multipart/form-data');
      
      const boundaryMatch = contentType.match(/boundary=(.+)$/);
      if (!boundaryMatch) {
        console.error('❌ No boundary in content-type');
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Invalid multipart data' })
        };
      }
      
      const boundary = boundaryMatch[1];
      console.log('Step J: Boundary =', boundary);
      
      // Decode body if base64
      console.log('Step K: Decoding body...');
      const bodyText = event.isBase64Encoded 
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body;
      
      console.log('Step L: Body decoded, length =', bodyText.length);
      
      // Split by boundary
      console.log('Step M: Splitting by boundary...');
      const parts = bodyText.split(`--${boundary}`);
      console.log('Step N: Found', parts.length, 'parts');
      
      let fieldCount = 0;
      for (const part of parts) {
        if (!part || part.trim() === '' || part.trim() === '--') continue;
        
        // Extract field name from Content-Disposition header
        const nameMatch = part.match(/Content-Disposition: form-data; name="([^"]+)"/);
        if (!nameMatch) continue;
        
        const fieldName = nameMatch[1];
        
        // Extract value (everything after the headers, which end with \r\n\r\n or \n\n)
        const headerEnd = part.indexOf('\r\n\r\n') > -1 ? part.indexOf('\r\n\r\n') + 4 : part.indexOf('\n\n') + 2;
        if (headerEnd < 4) continue;
        
        const value = part.substring(headerEnd).trim();
        emailData[fieldName] = value;
        
        fieldCount++;
        console.log(`Step O.${fieldCount}: Parsed field "${fieldName}": ${value.length} chars`);
      }
      
      console.log('Step P: Total fields parsed:', Object.keys(emailData).length);
    } else {
      console.log('Step Q: Not multipart, trying URL-encoded...');
      // Fallback to URL-encoded
      const formData = new URLSearchParams(event.body || '');
      for (const [key, value] of formData.entries()) {
        emailData[key] = value;
      }
      console.log('Step R: URL-encoded fields:', Object.keys(emailData).length);
    }

    // Extract key information from SendGrid's parsed email
    const fromEmailRaw = emailData.from || emailData.envelope || '';
    const fromEmail = extractEmail(fromEmailRaw);
    const subject = emailData.subject || '';
    
    // Try multiple field names for the email body
    // SendGrid can send: text, html, or the full raw email
    let textBody = emailData.text || emailData.plain || '';
    let htmlBody = emailData.html || '';
    
    // If no text/html, try to extract from the raw email field
    if (!textBody && !htmlBody && emailData.email) {
      try {
        console.log('📧 No text/html fields, parsing raw email...');
        console.log('📧 Raw email length:', emailData.email.length);
        
        const rawEmail = emailData.email;
        
        // Method 1: Look for blank line after headers
        let bodyStart = rawEmail.indexOf('\r\n\r\n');
        if (bodyStart === -1) bodyStart = rawEmail.indexOf('\n\n');
        
        if (bodyStart > -1) {
          const separator = rawEmail.indexOf('\r\n\r\n') > -1 ? '\r\n\r\n' : '\n\n';
          let fullBody = rawEmail.substring(bodyStart + separator.length).trim();
          
          console.log('📧 Step 1: Found body, length =', fullBody.length);
          
          // Check if this is a MIME multipart message
          if (fullBody.includes('Content-Type: text/plain')) {
            console.log('📧 Step 2: Detected MIME multipart');
            
            // Find the text/plain section - use a simpler approach
            const textPlainIndex = fullBody.indexOf('Content-Type: text/plain');
            
            // Look for content start - try \r\n\r\n first, then \n\n
            let contentStart = fullBody.indexOf('\r\n\r\n', textPlainIndex);
            let headerLength = 4; // \r\n\r\n
            
            if (contentStart === -1) {
              contentStart = fullBody.indexOf('\n\n', textPlainIndex);
              headerLength = 2; // \n\n
            }
            
            console.log('📧 Step 3: text/plain at', textPlainIndex, 'content at', contentStart);
            
            if (contentStart > -1) {
              let content = fullBody.substring(contentStart + headerLength);
              console.log('📧 Step 4: Raw content length =', content.length);
              
              // Stop at quoted reply marker ("On ... wrote:" which may span multiple lines)
              // Look for "On [date] at [time]" pattern which is how Gmail quotes
              const quoteIndex = content.search(/\n\nOn\s+.+?(\r?\n)?wrote:/is);
              if (quoteIndex > -1) {
                content = content.substring(0, quoteIndex);
                console.log('📧 Step 5: After removing quote, length =', content.length);
              }
              
              // Stop at MIME boundary (--xxxx)
              const boundaryIndex = content.indexOf('\n--');
              if (boundaryIndex > -1) {
                content = content.substring(0, boundaryIndex);
                console.log('📧 Step 6: After removing boundary, length =', content.length);
              }
              
              // Decode quoted-printable (=XX)
              content = content.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
                return String.fromCharCode(parseInt(hex, 16));
              });
              
              // Remove soft line breaks (= at end of line)
              content = content.replace(/=\r?\n/g, '');
              
              // Fix common UTF-8 encoding issues (like â€¯ which is a non-breaking space)
              // These are from misencoded characters
              content = content.replace(/â€¯/g, ' '); // Non-breaking space
              content = content.replace(/â€™/g, "'"); // Right single quotation mark
              content = content.replace(/â€œ/g, '"'); // Left double quotation mark
              content = content.replace(/â€/g, '"'); // Right double quotation mark
              content = content.replace(/â€"/g, '—'); // Em dash
              content = content.replace(/â€"/g, '–'); // En dash
              
              textBody = content.trim();
              console.log('📧 Step 7: FINAL textBody length =', textBody.length);
              console.log('📧 Step 8: FINAL textBody =', textBody);
            } else {
              console.log('⚠️ Could not find content start');
            }
          } else {
            console.log('📧 Plain email (not MIME)');
            textBody = fullBody;
          }
        } else {
          console.log('⚠️ Could not find body separator');
        }
      } catch (err) {
        console.error('❌ Error parsing raw email:', err.message);
        console.error('Stack:', err.stack);
      }
    }
    
    const toEmail = emailData.to || '';
    
    if (!fromEmail) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Could not extract sender email address' })
      };
    }

    // Extract thread ID from email headers or body
    let threadId = null;
    
    // Method 1: Extract from TO address (threadId@replies.cascadeconnect.app)
    if (toEmail && toEmail.includes('@replies.cascadeconnect.app')) {
      const toMatch = toEmail.match(/([a-f0-9-]+)@replies\.cascadeconnect\.app/i);
      if (toMatch) {
        threadId = toMatch[1];
        console.log(`✅ Extracted thread ID from TO address: ${threadId}`);
      }
    }
    
    // Method 2: Check for custom header we add when sending
    const headers = emailData.headers || '';
    if (headers && !threadId) {
      const headerMatch = headers.match(/X-Thread-ID:\s*([a-f0-9-]+)/i);
      if (headerMatch) {
        threadId = headerMatch[1];
      }
    }
    
    // Method 3: Extract from References or In-Reply-To header
    const references = emailData.references || emailData['in-reply-to'] || '';
    if (references && !threadId) {
      const threadMatch = references.match(/<([a-f0-9-]+)@/);
      if (threadMatch) {
        threadId = threadMatch[1];
      }
    }
    
    // Method 4: Parse from email body footer (fallback)
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
      threadId: threadId,
      hasText: !!textBody,
      hasHtml: !!htmlBody
    });
    
    if (!threadId) {
      console.warn('⚠️ Could not extract thread ID from email');
      console.log('TO email:', toEmail);
      console.log('Headers:', headers);
      console.log('References:', references);
    }

    // Connect to database
    client = await getDbClient();

    // Find homeowner by email (check both primary and buyer 2 email)
    const homeownerResult = await client.query(
      'SELECT id, name, email FROM homeowners WHERE LOWER(email) = $1 OR LOWER(buyer_2_email) = $1 LIMIT 1',
      [fromEmail]
    );

    if (homeownerResult.rows.length === 0) {
      console.warn(`⚠️ Homeowner not found for email: ${fromEmail}`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          success: true,
          message: 'Email received but homeowner not found',
          from: fromEmail
        })
      };
    }

    const homeowner = homeownerResult.rows[0];
    const homeownerId = homeowner.id;
    const homeownerName = homeowner.name;

    // Clean email body - remove quoted replies and footers
    let cleanBody = textBody || htmlBody.replace(/<[^>]*>/g, '');
    // Remove common email reply patterns
    cleanBody = cleanBody
      .replace(/^On .+ wrote:.*$/gm, '')
      .replace(/^From:.*$/gm, '')
      .replace(/^Sent:.*$/gm, '')
      .replace(/^To:.*$/gm, '')
      .replace(/^Subject:.*$/gm, '')
      .replace(/Reply-To ID:.*$/gm, '')
      .replace(/^[-_]{3,}.*$/gm, '')
      .trim();

    if (!cleanBody) {
      console.warn('⚠️ Email body is empty after cleaning');
      cleanBody = '(No message content)';
    }

    // Find or create message thread
    let thread = null;
    
    if (threadId) {
      // Try to find existing thread
      const threadResult = await client.query(
        'SELECT * FROM message_threads WHERE id = $1',
        [threadId]
      );
      
      if (threadResult.rows.length > 0) {
        thread = threadResult.rows[0];
      }
    }

    // If thread not found, try to find by subject and homeowner
    if (!thread) {
      const subjectResult = await client.query(
        'SELECT * FROM message_threads WHERE homeowner_id = $1 AND subject = $2 ORDER BY last_message_at DESC LIMIT 1',
        [homeownerId, subject.replace(/^Re:\s*/i, '')]
      );
      
      if (subjectResult.rows.length > 0) {
        thread = subjectResult.rows[0];
        threadId = thread.id;
      }
    }

    // Create new thread if none found
    if (!thread) {
      threadId = uuidv4();
      const newSubject = subject.replace(/^Re:\s*/i, '');
      
      await client.query(
        `INSERT INTO message_threads (id, subject, homeowner_id, participants, is_read, last_message_at, messages)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          threadId,
          newSubject,
          homeownerId,
          JSON.stringify([homeownerName]),
          false, // Mark as unread for admin
          new Date().toISOString(),
          JSON.stringify([])
        ]
      );
      
      console.log(`✅ Created new message thread: ${threadId}`);
    }

    // Create the message
    const messageId = uuidv4();
    const now = new Date();
    const newMessage = {
      id: messageId,
      senderId: homeownerId,
      senderName: homeownerName,
      senderRole: 'HOMEOWNER',
      content: cleanBody,
      timestamp: now.toISOString()
    };

    // Get existing messages and add new one
    const existingMessages = thread ? (thread.messages || []) : [];
    const updatedMessages = [...existingMessages, newMessage];

    // Update thread with new message
    await client.query(
      `UPDATE message_threads 
       SET messages = $1, 
           last_message_at = $2, 
           is_read = $3
       WHERE id = $4`,
      [
        JSON.stringify(updatedMessages),
        new Date().toISOString(),
        false, // Mark as unread for admin
        threadId
      ]
    );

    console.log(`✅ Message created in thread ${threadId} from ${homeownerName} (${fromEmail})`);

    // Send email notification to the internal user who sent the initial message
    try {
      // Find the original sender (first ADMIN message in the thread)
      let originalSenderId = null;
      let originalSenderName = null;
      
      if (thread && thread.messages) {
        const messages = Array.isArray(thread.messages) ? thread.messages : JSON.parse(thread.messages || '[]');
        
        // Find the first message with senderRole === 'ADMIN'
        const originalMessage = messages.find(msg => {
          const msgObj = typeof msg === 'string' ? JSON.parse(msg) : msg;
          return msgObj.senderRole === 'ADMIN';
        });
        
        if (originalMessage) {
          const msgObj = typeof originalMessage === 'string' ? JSON.parse(originalMessage) : originalMessage;
          originalSenderId = msgObj.senderId;
          originalSenderName = msgObj.senderName;
        }
      }

      // If we found the original sender, get their email
      if (originalSenderId) {
        const userResult = await client.query(
          'SELECT id, name, email FROM users WHERE id = $1',
          [originalSenderId]
        );

        if (userResult.rows.length > 0) {
          const originalSender = userResult.rows[0];
          
          // Get thread subject for email
          const threadSubject = thread ? thread.subject : subject.replace(/^Re:\s*/i, '');
          
          // Prepare email content
          const emailSubject = `Re: ${threadSubject}`;
          const emailBody = `
${homeownerName} replied to your message:

"${cleanBody}"
          `.trim();

          const fromEmail = process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
          const htmlBody = emailBody.replace(/\n/g, '<br>');

          // Send email to the original sender
          try {
            // Prefer SendGrid if API key is available
            if (process.env.SENDGRID_API_KEY) {
              const sgMail = require('@sendgrid/mail');
              sgMail.setApiKey(process.env.SENDGRID_API_KEY);

              const messageId = `${threadId}@${(process.env.SENDGRID_REPLY_EMAIL || 'cascadeconnect.netlify.app').split('@')[1] || 'cascadeconnect.netlify.app'}`;

              const msg = {
                to: originalSender.email,
                from: {
                  email: fromEmail,
                  name: 'Cascade Connect'
                },
                subject: emailSubject,
                text: emailBody,
                html: `
                  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    ${htmlBody}
                  </div>
                `,
                replyTo: fromEmail,
                headers: {
                  'X-Thread-ID': threadId,
                  'In-Reply-To': messageId,
                  'References': messageId
                },
                customArgs: {
                  threadId: threadId
                }
              };

              await sgMail.send(msg);
              console.log(`✅ Notification email sent via SendGrid to ${originalSender.name} (${originalSender.email})`);
            } 
            // Fall back to SMTP
            else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
              const nodemailer = require('nodemailer');
              
              const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASS,
                },
              });

              const messageId = `${threadId}@${(process.env.SMTP_FROM || 'localhost').split('@')[1] || 'localhost'}`;

              const mailOptions = {
                from: `Cascade Connect <${fromEmail}>`,
                to: originalSender.email,
                subject: emailSubject,
                text: emailBody,
                html: `
                  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    ${htmlBody}
                  </div>
                `,
                replyTo: fromEmail,
                headers: {
                  'X-Thread-ID': threadId,
                  'In-Reply-To': messageId,
                  'References': messageId
                }
              };

              await transporter.sendMail(mailOptions);
              console.log(`✅ Notification email sent via SMTP to ${originalSender.name} (${originalSender.email})`);
            } else {
              console.warn(`⚠️ Email not configured - cannot send notification to ${originalSender.email}`);
            }
          } catch (emailError) {
            console.error(`❌ Error sending notification to ${originalSender.email}:`, emailError);
          }
        } else {
          console.warn(`⚠️ Original sender user not found in database (ID: ${originalSenderId})`);
        }
      } else {
        console.warn('⚠️ Could not identify original sender - thread may be new or no ADMIN messages found');
      }
    } catch (emailError) {
      // Don't fail the whole operation if email notification fails
      console.error('❌ Error sending notification emails:', emailError);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Email processed and message created',
        threadId: threadId,
        messageId: messageId,
        from: fromEmail,
        homeownerId: homeownerId
      })
    };
  } catch (error) {
    console.error('❌ Error processing inbound email:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message || 'Failed to process inbound email',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        console.error('Error closing database connection:', e);
      }
    }
  }
};


