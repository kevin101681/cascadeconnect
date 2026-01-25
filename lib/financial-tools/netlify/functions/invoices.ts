
import { Handler } from '@netlify/functions';
import { getDbClient, headers } from './db';

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let client;

  try {
    client = await getDbClient();

    const pathParts = event.path.split('/');
    const id = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;
    const isList = id === 'invoices' || id === '';

    // GET: List all invoices
    if (event.httpMethod === 'GET') {
      const result = await client.query('SELECT * FROM invoices ORDER BY date DESC');

      const invoices = result.rows.map(row => ({
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
        items: row.items // JSONB
      }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(invoices),
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
      const row = result.rows[0];
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(mapRowToInvoice(row)),
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
        return { statusCode: 404, headers, body: 'Invoice not found' };
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
      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };

  } catch (error: any) {
    console.error("INVOICE FUNCTION ERROR:", error);
    // Return the actual DB error to help debugging
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Unknown database error" }),
    };
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
};

const mapRowToInvoice = (row: any) => ({
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