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
    const expensesIndex = pathParts.indexOf('expenses');
    if (expensesIndex >= 0 && pathParts.length > expensesIndex + 1) {
      id = pathParts[expensesIndex + 1];
    } else if (pathParts.length > 0 && pathParts[pathParts.length - 1] !== 'expenses' && pathParts[pathParts.length - 1] !== 'cbsbooks-expenses') {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length > 10) {
        id = lastPart;
      }
    }
    const isList = !id && (path.includes('/expenses') || path.endsWith('/cbsbooks-expenses') || path.endsWith('/expenses'));
    
    client = await getDbClient();

    if (event.httpMethod === 'GET' && isList) {
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
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }, 
        body: JSON.stringify(expenses) 
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const result = await client.query(
        'INSERT INTO expenses (id, date, payee, category, amount, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [data.id, data.date, data.payee, data.category, data.amount, data.description]
      );
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
        })
      };
    }

    if (event.httpMethod === 'DELETE' && !isList) {
      await client.query('DELETE FROM expenses WHERE id = $1', [id]);
      return { statusCode: 204, headers, body: '' };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error("EXPENSES ERROR:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  } finally {
    if (client) {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }
};


