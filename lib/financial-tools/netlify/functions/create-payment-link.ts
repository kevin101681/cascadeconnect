
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const environment = process.env.SQUARE_ENVIRONMENT || 'production'; // 'sandbox' or 'production'

  // Debug Logging (Masked)
  console.log(`Square Config: Env=${environment}`);
  console.log(`Token Present: ${!!accessToken}`);
  console.log(`Location ID: ${locationId}`);

  if (!accessToken || !locationId) {
    console.error("Square Configuration Missing");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Square configuration missing. Ensure you have set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in Netlify. (Do not use Application ID for Location ID)." 
      })
    };
  }

  // --- VALIDATION CHECKS ---

  // 1. Check if Access Token looks like an App ID
  if (accessToken.startsWith('sq0idp-')) {
    const msg = "Invalid Square Configuration: You provided an Application ID (sq0idp-...) as the SQUARE_ACCESS_TOKEN. Please use the Production Access Token (starts with EAAA...) from Square Dashboard -> Credentials.";
    console.error(msg);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: msg })
    };
  }

  // 2. Check if Location ID looks like an App ID (Common Mistake)
  if (locationId.startsWith('sq0idp-') || locationId.startsWith('sq0app-')) {
    const msg = "Invalid Square Configuration: You provided an Application ID (sq0idp-...) as the SQUARE_LOCATION_ID. Please find your specific Location ID in Square Dashboard -> Locations.";
    console.error(msg);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: msg })
    };
  }

  try {
    const { orderId, amount, name, description } = JSON.parse(event.body || '{}');

    if (!amount || !name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields (amount, name)" })
      };
    }

    // Determine Base URL based on Environment
    const baseUrl = environment.toLowerCase() === 'sandbox' 
      ? 'https://connect.squareupsandbox.com' 
      : 'https://connect.squareup.com';

    // Square API Request
    const idempotencyKey = `${orderId}-${Date.now()}`;

    const squarePayload = {
      idempotency_key: idempotencyKey,
      quick_pay: {
        name: name,
        price_money: {
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'USD'
        },
        location_id: locationId
      },
      description: description || `Invoice #${orderId}`,
      checkout_options: {
        allow_tipping: false
      }
    };

    console.log(`Sending request to ${baseUrl}/v2/online-checkout/payment-links`);

    const response = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-02-22'
      },
      body: JSON.stringify(squarePayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Square API Error Response:", JSON.stringify(data, null, 2));
      
      let errorMsg = "Failed to create Square link";
      if (data.errors && data.errors.length > 0) {
        const err = data.errors[0];
        if (err.category === 'AUTHENTICATION_ERROR') {
             errorMsg = `Square Auth Failed: ${err.detail}. Verify Token and Environment (${environment}).`;
        } else if (err.code === 'LOCATION_MISMATCH') {
             errorMsg = `Square Location Mismatch: The Location ID provided does not belong to this Access Token.`;
        } else {
             errorMsg = `Square Error: ${err.detail || err.code}`;
        }
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: errorMsg })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        // Use long_url instead of url to avoid SSL certificate issues with shortened URLs
        // long_url uses Square's own domain which has proper SSL certificates
        url: data.payment_link.long_url || data.payment_link.url,
        id: data.payment_link.id 
      })
    };

  } catch (error: any) {
    console.error("Server Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
