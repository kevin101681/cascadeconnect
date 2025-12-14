const { Client } = require('pg');

const getDbClient = async () => {
  let connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!connectionString) {
    throw new Error("Database configuration is missing. Please set NETLIFY_DATABASE_URL, DATABASE_URL, or VITE_DATABASE_URL.");
  }
  if (connectionString.includes('cbs%2Fbooks')) {
    connectionString = connectionString.replace('cbs%2Fbooks', 'cbs_books');
  }
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

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let client;
  try {
    const path = event.path || '';
    const pathParts = path.split('/').filter(p => p);
    let id = null;
    const clientsIndex = pathParts.indexOf('clients');
    if (clientsIndex >= 0 && pathParts.length > clientsIndex + 1) {
      id = pathParts[clientsIndex + 1];
    } else if (pathParts.length > 0 && pathParts[pathParts.length - 1] !== 'clients' && pathParts[pathParts.length - 1] !== 'cbsbooks-clients') {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length > 10) {
        id = lastPart;
      }
    }
    const isList = !id && (path.includes('/clients') || path.endsWith('/cbsbooks-clients') || path.endsWith('/clients'));
    
    client = await getDbClient();

    if (event.httpMethod === 'GET' && isList) {
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
      return { 
        statusCode: 200, 
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }, 
        body: JSON.stringify(clients) 
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const legacyAddress = data.address || `${data.addressLine1 || ''} ${data.city || ''} ${data.state || ''}`.trim();
      const result = await client.query(
        `INSERT INTO clients (id, company_name, check_payor_name, email, address_line1, address_line2, city, state, zip, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [data.id, data.companyName, data.checkPayorName || null, data.email,
         data.addressLine1 || null, data.addressLine2 || null, data.city || null, data.state || null, data.zip || null, legacyAddress]
      );
      const row = result.rows[0];
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
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
        })
      };
    }

    if (event.httpMethod === 'PUT' && !isList) {
      const data = JSON.parse(event.body || '{}');
      const legacyAddress = data.address || `${data.addressLine1 || ''} ${data.city || ''} ${data.state || ''}`.trim();
      const result = await client.query(
        `UPDATE clients SET company_name = $1, check_payor_name = $2, email = $3,
         address_line1 = $4, address_line2 = $5, city = $6, state = $7, zip = $8, address = $9
         WHERE id = $10 RETURNING *`,
        [data.companyName, data.checkPayorName || null, data.email,
         data.addressLine1 || null, data.addressLine2 || null, data.city || null, data.state || null, data.zip || null,
         legacyAddress, id]
      );
      if (result.rows.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Client not found' }) };
      }
      const row = result.rows[0];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
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
        })
      };
    }

    if (event.httpMethod === 'DELETE' && !isList) {
      await client.query('DELETE FROM clients WHERE id = $1', [id]);
      return { statusCode: 204, headers, body: '' };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error("CLIENTS ERROR:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
};


