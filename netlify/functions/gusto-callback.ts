import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  console.log("🔥 Gusto Callback Triggered (Bypass Mode)");

  // 1. Safe Parameter Extraction
  const code = event.queryStringParameters?.code;
  
  if (!code) {
    return { statusCode: 400, body: "Missing Code" };
  }

  // 2. Env Var Check
  const CLIENT_ID = process.env.GUSTO_CLIENT_ID;
  const CLIENT_SECRET = process.env.GUSTO_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GUSTO_REDIRECT_URI;

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error("Missing Env Vars");
    return { statusCode: 500, body: "Server Configuration Error" };
  }

  try {
    // 3. Exchange Token (Standard Fetch)
    // We still fetch the token to prove the code is valid!
    const tokenResponse = await fetch("https://api.gusto-demo.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Gusto Error:", tokenData);
      return { statusCode: 400, body: JSON.stringify(tokenData) };
    }

    console.log("✅ Token received successfully! (Skipping DB Save for safety)");
    // TODO: We will re-enable the DB save once schema is synced.

    // 4. The "Bounce Page" Response (Status 200 HTML)
    // This forces the browser to treat the next move as a clean navigation.
    const successUrl = `/gusto-success?t=${Date.now()}`;
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Redirecting...</title>
            <meta http-equiv="refresh" content="0;url=${successUrl}" />
          </head>
          <body>
            <p>Connection Successful. Redirecting...</p>
            <script>window.location.href = "${successUrl}";</script>
          </body>
        </html>
      `,
    };

  } catch (error) {
    console.error("Handler Error:", error);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};

