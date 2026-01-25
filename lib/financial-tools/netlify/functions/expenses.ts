
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
    const isList = id === 'expenses' || id === '';

    if (event.httpMethod === 'GET') {
      const result = await client.query('SELECT * FROM expenses ORDER BY date DESC');
      const expenses = result.rows.map(row => ({
        id: row.id,
        date: row.date.toISOString().split('T')[0],
        payee: row.payee,
        category: row.category,
        amount: parseFloat(row.amount),
        description: row.description
      }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(expenses),
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const query = `
        INSERT INTO expenses (id, date, payee, category, amount, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const values = [data.id, data.date, data.payee, data.category, data.amount, data.description];
      const result = await client.query(query, values);
      const row = result.rows[0];
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          id: row.id,
          date: row.date.toISOString().split('T')[0],
          payee: row.payee,
          category: row.category,
          amount: parseFloat(row.amount),
          description: row.description
        }),
      };
    }

    if (event.httpMethod === 'DELETE' && !isList) {
      await client.query('DELETE FROM expenses WHERE id = $1', [id]);
      return {
        statusCode: 204,
        headers,
        body: '',
      };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };

  } catch (error: any) {
    console.error("EXPENSES ERROR:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    if (client) await client.end();
  }
};
