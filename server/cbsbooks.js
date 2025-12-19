import express from 'express';
import pg from 'pg';
const { Client } = pg;
const router = express.Router();

// Helper to get database connection (same as Netlify Functions)
const getDbClient = async () => {
  let connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Database configuration is missing. Please set NETLIFY_DATABASE_URL or DATABASE_URL.");
  }
  
  // Auto-fix database name
  if (connectionString.includes('cbs%2Fbooks')) {
    connectionString = connectionString.replace('cbs%2Fbooks', 'cbs_books');
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

// Helper to map invoice row
const mapRowToInvoice = (row) => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  clientName: row.client_name,
  clientEmail: row.client_email || '',
  projectDetails: row.project_details || '',
  paymentLink: row.payment_link || '',
  checkNumber: row.check_number || '',
  date: row.date.toISOString().split('T')[0],
  dueDate: row.due_date.toISOString().split('T')[0],
  datePaid: row.date_paid ? row.date_paid.toISOString().split('T')[0] : undefined,
  total: parseFloat(row.total),
  status: row.status,
  items: row.items
});

// --- INVOICES ROUTES ---
router.get('/invoices', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    const result = await client.query('SELECT * FROM invoices ORDER BY date DESC');
    const invoices = result.rows.map(mapRowToInvoice);
    res.json(invoices);
  } catch (error) {
    console.error("INVOICES GET ERROR:", error);
    res.status(500).json({ error: error.message || "Unknown database error" });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

router.post('/invoices', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    const data = req.body;
    const query = `
      INSERT INTO invoices (
        id, invoice_number, client_name, client_email, 
        project_details, payment_link, check_number, date, due_date, date_paid,
        total, status, items
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [
      data.id,
      data.invoiceNumber,
      data.clientName,
      data.clientEmail || null,
      data.projectDetails || null,
      data.paymentLink || null,
      data.checkNumber || null,
      data.date,
      data.dueDate,
      data.datePaid || null,
      data.total,
      data.status,
      JSON.stringify(data.items)
    ];
    const result = await client.query(query, values);
    res.status(201).json(mapRowToInvoice(result.rows[0]));
  } catch (error) {
    console.error("INVOICES POST ERROR:", error);
    res.status(500).json({ error: error.message || "Unknown database error" });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

router.put('/invoices/:id', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    const data = req.body;
    const id = req.params.id;
    const query = `
      UPDATE invoices SET
        invoice_number = $1, client_name = $2, client_email = $3,
        project_details = $4, payment_link = $5, check_number = $6, date = $7, due_date = $8, date_paid = $9,
        total = $10, status = $11, items = $12
      WHERE id = $13
      RETURNING *
    `;
    const values = [
      data.invoiceNumber,
      data.clientName,
      data.clientEmail || null,
      data.projectDetails || null,
      data.paymentLink || null,
      data.checkNumber || null,
      data.date,
      data.dueDate,
      data.datePaid || null,
      data.total,
      data.status,
      JSON.stringify(data.items),
      id
    ];
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(mapRowToInvoice(result.rows[0]));
  } catch (error) {
    console.error("INVOICES PUT ERROR:", error);
    res.status(500).json({ error: error.message || "Unknown database error" });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

router.delete('/invoices/:id', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    await client.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error("INVOICES DELETE ERROR:", error);
    res.status(500).json({ error: error.message || "Unknown database error" });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

// --- EXPENSES ROUTES ---
router.get('/expenses', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    const result = await client.query('SELECT * FROM expenses ORDER BY date DESC');
    const expenses = result.rows.map(row => ({
      id: row.id,
      date: row.date.toISOString().split('T')[0],
      payee: row.payee,
      category: row.category,
      amount: parseFloat(row.amount),
      description: row.description
    }));
    res.json(expenses);
  } catch (error) {
    console.error("EXPENSES GET ERROR:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

router.post('/expenses', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    const data = req.body;
    const query = `
      INSERT INTO expenses (id, date, payee, category, amount, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [data.id, data.date, data.payee, data.category, data.amount, data.description];
    const result = await client.query(query, values);
    const row = result.rows[0];
    
    res.status(201).json({
      id: row.id,
      date: row.date.toISOString().split('T')[0],
      payee: row.payee,
      category: row.category,
      amount: parseFloat(row.amount),
      description: row.description
    });
  } catch (error) {
    console.error("EXPENSES POST ERROR:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

router.delete('/expenses/:id', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    await client.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error("EXPENSES DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

// --- CLIENTS ROUTES ---
router.get('/clients', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    const result = await client.query('SELECT * FROM clients ORDER BY company_name ASC');
    const clients = result.rows.map(row => ({
      id: row.id,
      companyName: row.company_name,
      checkPayorName: row.check_payor_name || '',
      email: row.email,
      address: row.address,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      state: row.state,
      zip: row.zip
    }));
    res.json(clients);
  } catch (error) {
    console.error("CLIENTS GET ERROR:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

router.post('/clients', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    const data = req.body;
    const query = `
      INSERT INTO clients (
          id, company_name, check_payor_name, email, 
          address_line1, address_line2, city, state, zip, address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const legacyAddress = data.address || `${data.addressLine1 || ''} ${data.city || ''} ${data.state || ''}`.trim();
    const values = [
      data.id, 
      data.companyName, 
      data.checkPayorName || null, 
      data.email,
      data.addressLine1 || null,
      data.addressLine2 || null,
      data.city || null,
      data.state || null,
      data.zip || null,
      legacyAddress
    ];
    const result = await client.query(query, values);
    const row = result.rows[0];
    
    res.status(201).json({
      id: row.id,
      companyName: row.company_name,
      checkPayorName: row.check_payor_name,
      email: row.email,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      state: row.state,
      zip: row.zip,
      address: row.address
    });
  } catch (error) {
    console.error("CLIENTS POST ERROR:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

router.put('/clients/:id', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    const data = req.body;
    const id = req.params.id;
    const query = `
      UPDATE clients SET
        company_name = $1, check_payor_name = $2, email = $3,
        address_line1 = $4, address_line2 = $5, city = $6, state = $7, zip = $8, address = $9
      WHERE id = $10
      RETURNING *
    `;
    const legacyAddress = data.address || `${data.addressLine1 || ''} ${data.city || ''} ${data.state || ''}`.trim();
    const values = [
      data.companyName,
      data.checkPayorName || null,
      data.email,
      data.addressLine1 || null,
      data.addressLine2 || null,
      data.city || null,
      data.state || null,
      data.zip || null,
      legacyAddress,
      id
    ];
    
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      companyName: row.company_name,
      checkPayorName: row.check_payor_name,
      email: row.email,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      state: row.state,
      zip: row.zip,
      address: row.address
    });
  } catch (error) {
    console.error("CLIENTS PUT ERROR:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

router.delete('/clients/:id', async (req, res) => {
  let client;
  try {
    client = await getDbClient();
    await client.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error("CLIENTS DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
});

// --- PAYMENT LINK ROUTE ---
router.post('/create-payment-link', async (req, res) => {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const environment = process.env.SQUARE_ENVIRONMENT || 'production';

  if (!accessToken || !locationId) {
    return res.status(500).json({ 
      error: "Square configuration missing. Ensure you have set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID." 
    });
  }

  if (accessToken.startsWith('sq0idp-')) {
    return res.status(500).json({ 
      error: "Invalid Square Configuration: You provided an Application ID as the SQUARE_ACCESS_TOKEN. Please use the Production Access Token." 
    });
  }

  try {
    const { orderId, amount, name, description } = req.body;
    const baseUrl = environment === 'sandbox' 
      ? 'https://connect.squareupsandbox.com' 
      : 'https://connect.squareup.com';

    const response = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: `${orderId}-${Date.now()}`,
        quick_pay: {
          name: name || `Invoice ${orderId}`,
          price_money: {
            amount: Math.round(amount * 100),
            currency: 'USD'
          },
          location_id: locationId
        },
        checkout_options: {
          ask_for_shipping_address: false,
          allow_tipping: false
        },
        pre_populated_data: {
          buyer_email: '',
          buyer_phone_number: ''
        },
        description: description || ''
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Square API Error Response:", JSON.stringify(data, null, 2));
      throw new Error(data.errors?.[0]?.detail || `Square API Error: ${response.status}`);
    }

    res.json({ url: data.payment_link.url });
  } catch (error) {
    console.error("PAYMENT LINK ERROR:", error);
    res.status(500).json({ error: error.message || "Failed to create payment link" });
  }
});

// --- SEND EMAIL ROUTE ---
router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, text, html, attachment } = req.body;

    if (!to || !attachment) {
      return res.status(400).json({ error: "Missing 'to' address or attachment data." });
    }

    // Strip data URI prefix from attachment data if present
    const base64Content = attachment.data.replace(/^data:application\/pdf;base64,/, "");
    const fromEmail = process.env.SENDGRID_REPLY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || 'info@cascadebuilderservices.com';

    // Prefer SendGrid if API key is available
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = (await import('@sendgrid/mail')).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: to,
        from: {
          email: fromEmail,
          name: 'Cascade Builder Services'
        },
        subject: subject || 'Invoice from Cascade Builder Services',
        text: text || '',
        html: html || text || '',
        attachments: [{
          content: base64Content,
          filename: attachment.filename || 'invoice.pdf',
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      };

      const [response] = await sgMail.send(msg);
      console.log('✅ Email sent via SendGrid:', response.statusCode);
      res.json({ 
        message: 'Email sent successfully',
        messageId: response.headers['x-message-id']
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Fallback to SMTP if SendGrid not configured
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

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Cascade Builder Services'}" <${fromEmail}>`,
        to: to,
        subject: subject || 'Invoice from Cascade Builder Services',
        text: text || '',
        html: html || text || '',
        attachments: [{
          filename: attachment.filename || 'invoice.pdf',
          content: base64Content,
          encoding: 'base64',
          contentType: 'application/pdf'
        }]
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent via SMTP:', info.messageId);
      res.json({ 
        message: 'Email sent successfully',
        messageId: info.messageId
      });
    } else {
      return res.status(500).json({ 
        error: "Email configuration missing. Please set SENDGRID_API_KEY or SMTP credentials." 
      });
    }
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error);
    res.status(500).json({ error: error.message || "Failed to send email" });
  }
});

export default router;
