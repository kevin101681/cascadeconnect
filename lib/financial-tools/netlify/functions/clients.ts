
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
    const isList = id === 'clients' || id === '';

    if (event.httpMethod === 'GET') {
      const result = await client.query('SELECT * FROM clients ORDER BY company_name ASC');
      const clients = result.rows.map(row => ({
        id: row.id,
        companyName: row.company_name,
        checkPayorName: row.check_payor_name || '',
        email: row.email,
        address: row.address, // Keep legacy
        addressLine1: row.address_line1,
        addressLine2: row.address_line2,
        city: row.city,
        state: row.state,
        zip: row.zip
      }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(clients),
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const query = `
        INSERT INTO clients (
            id, company_name, check_payor_name, email, 
            address_line1, address_line2, city, state, zip, address
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      // We still save to 'address' as a fallback string for backward compatibility if needed, 
      // or explicitly use the new fields.
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
        }),
      };
    }

    if (event.httpMethod === 'PUT' && !isList) {
      const data = JSON.parse(event.body || '{}');
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
        return { statusCode: 404, headers, body: 'Client not found' };
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
        }),
      };
    }

    if (event.httpMethod === 'DELETE' && !isList) {
      if (client) { // Check ensures TS knows client is defined
        await client.query('DELETE FROM clients WHERE id = $1', [id]);
        return {
          statusCode: 204,
          headers,
          body: '',
        };
      }
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };

  } catch (error: any) {
    console.error("CLIENTS ERROR:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
};
