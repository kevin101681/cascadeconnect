const { Client } = require('pg');

// Helper to get database connection
const getDbClient = async () => {
  // Check all possible environment variable names
  let connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

  if (!connectionString) {
    console.error("Missing database URL. Available env vars:", Object.keys(process.env).filter(k => k.includes('DATABASE')));
    throw new Error("Database configuration is missing. Please set NETLIFY_DATABASE_URL, DATABASE_URL, or VITE_DATABASE_URL in Netlify environment variables.");
  }
  
  console.log("Connecting to database...");
  
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
  console.log("Database connected successfully");
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

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let client;
  try {
    // Parse path - handle both /api/cbsbooks/invoices and /.netlify/functions/cbsbooks-invoices
    const path = event.path || '';
    const pathParts = path.split('/').filter(p => p);
    
    // Check if this is a migration request
    const isMigration = path.includes('migrate-localstorage');
    
    // Extract invoice ID if present (e.g., /api/cbsbooks/invoices/123 or /invoices/123)
    let id = null;
    const invoicesIndex = pathParts.indexOf('invoices');
    if (invoicesIndex >= 0 && pathParts.length > invoicesIndex + 1) {
      id = pathParts[invoicesIndex + 1];
    } else if (pathParts.length > 0 && pathParts[pathParts.length - 1] !== 'invoices' && pathParts[pathParts.length - 1] !== 'cbsbooks-invoices') {
      // Last part might be an ID if it's not 'invoices'
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length > 10) { // UUIDs are longer than 10 chars
        id = lastPart;
      }
    }
    
    const isList = !id && (path.includes('/invoices') || path.endsWith('/cbsbooks-invoices') || path.endsWith('/invoices'));
    
    client = await getDbClient();

    // Handle migration endpoint
    if (isMigration && event.httpMethod === 'POST') {
      const { invoices = [], expenses = [], clients: clientsData = [] } = JSON.parse(event.body || '{}');
      
      let invoicesMigrated = 0;
      let expensesMigrated = 0;
      let clientsMigrated = 0;
      let invoicesSkipped = 0;
      let expensesSkipped = 0;
      let clientsSkipped = 0;

      // Migrate invoices
      for (const invoice of invoices) {
        try {
          const exists = await client.query('SELECT id FROM invoices WHERE id = $1', [invoice.id]);
          if (exists.rows.length > 0) {
            invoicesSkipped++;
            continue;
          }

          let items = invoice.items || [];
          if (typeof items === 'string') {
            try {
              items = JSON.parse(items);
            } catch {
              items = [];
            }
          }

          await client.query(`
            INSERT INTO invoices (
              id, invoice_number, client_name, client_email, project_details,
              payment_link, check_number, date, due_date, date_paid,
              total, status, items
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO NOTHING
          `, [
            invoice.id,
            invoice.invoiceNumber || invoice.invoice_number,
            invoice.clientName || invoice.client_name,
            invoice.clientEmail || invoice.client_email || null,
            invoice.projectDetails || invoice.project_details || null,
            invoice.paymentLink || invoice.payment_link || null,
            invoice.checkNumber || invoice.check_number || null,
            invoice.date,
            invoice.dueDate || invoice.due_date,
            invoice.datePaid || invoice.date_paid || null,
            invoice.total,
            invoice.status || 'draft',
            JSON.stringify(items)
          ]);
          invoicesMigrated++;
        } catch (error) {
          console.error(`Failed to migrate invoice ${invoice.invoiceNumber || invoice.id}:`, error.message);
        }
      }

      // Migrate expenses
      for (const expense of expenses) {
        try {
          const exists = await client.query('SELECT id FROM expenses WHERE id = $1', [expense.id]);
          if (exists.rows.length > 0) {
            expensesSkipped++;
            continue;
          }

          await client.query(`
            INSERT INTO expenses (id, date, payee, category, amount, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING
          `, [
            expense.id,
            expense.date,
            expense.payee,
            expense.category,
            expense.amount,
            expense.description || null
          ]);
          expensesMigrated++;
        } catch (error) {
          console.error(`Failed to migrate expense ${expense.id}:`, error.message);
        }
      }

      // Migrate clients
      for (const clientData of clientsData) {
        try {
          const exists = await client.query('SELECT id FROM clients WHERE id = $1', [clientData.id]);
          if (exists.rows.length > 0) {
            clientsSkipped++;
            continue;
          }

          await client.query(`
            INSERT INTO clients (
              id, company_name, check_payor_name, email,
              address_line1, address_line2, city, state, zip, address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
          `, [
            clientData.id,
            clientData.companyName || clientData.company_name,
            clientData.checkPayorName || clientData.check_payor_name || null,
            clientData.email || null,
            clientData.addressLine1 || clientData.address_line1 || null,
            clientData.addressLine2 || clientData.address_line2 || null,
            clientData.city || null,
            clientData.state || null,
            clientData.zip || null,
            clientData.address || null
          ]);
          clientsMigrated++;
        } catch (error) {
          console.error(`Failed to migrate client ${clientData.companyName || clientData.id}:`, error.message);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          invoices: { migrated: invoicesMigrated, skipped: invoicesSkipped },
          expenses: { migrated: expensesMigrated, skipped: expensesSkipped },
          clients: { migrated: clientsMigrated, skipped: clientsSkipped }
        })
      };
    }

    // GET: List all invoices
    if (event.httpMethod === 'GET' && isList) {
      console.log('Fetching all invoices from database...');
      const result = await client.query('SELECT * FROM invoices ORDER BY date DESC');
      console.log(`Found ${result.rows.length} invoices`);
      const invoices = result.rows.map(mapRowToInvoice);
      const body = JSON.stringify(invoices);
      console.log('Returning invoices, body length:', body.length);
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: body,
      };
    }

    // GET: Get single invoice
    if (event.httpMethod === 'GET' && !isList) {
      const result = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invoice not found' }) };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mapRowToInvoice(result.rows[0])),
      };
    }

    // POST: Create invoice
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
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
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(mapRowToInvoice(result.rows[0])),
      };
    }

    // PUT: Update invoice
    if (event.httpMethod === 'PUT' && !isList) {
      const data = JSON.parse(event.body || '{}');
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
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invoice not found' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mapRowToInvoice(result.rows[0])),
      };
    }

    // DELETE: Delete invoice
    if (event.httpMethod === 'DELETE' && !isList) {
      await client.query('DELETE FROM invoices WHERE id = $1', [id]);
      return { statusCode: 204, headers, body: '' };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error("INVOICES ERROR:", error);
    console.error("Error stack:", error.stack);
    console.error("Event path:", event.path);
    console.error("Event httpMethod:", event.httpMethod);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || "Unknown database error",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
};


