import { Handler } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";

export const handler: Handler = async (event, context) => {
  console.log("🔥 Gusto Callback Triggered (DB save enabled)");

  // 1. Safe Parameter Extraction
  const code = event.queryStringParameters?.code;
  const userId = event.queryStringParameters?.state;
  
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

    console.log("✅ Token received successfully!");

    // 4. Persist tokens if we have a userId and a configured database.
    if (userId) {
      const databaseUrl =
        process.env.DATABASE_URL ||
        process.env.VITE_DATABASE_URL ||
        process.env.NETLIFY_DATABASE_URL;

      if (!databaseUrl) {
        console.warn("⚠️ Database URL not configured; skipping token persistence");
      } else {
        try {
          const sql = neon(databaseUrl);

          // Ensure integration_tokens table exists (idempotent)
          await sql`
            CREATE TABLE IF NOT EXISTS integration_tokens (
              user_id text NOT NULL,
              provider text NOT NULL,
              access_token text,
              refresh_token text,
              created_at timestamptz DEFAULT now(),
              updated_at timestamptz DEFAULT now(),
              PRIMARY KEY (user_id, provider)
            );
          `;

          await sql`
            INSERT INTO integration_tokens (user_id, provider, access_token, refresh_token, created_at, updated_at)
            VALUES (${userId}, 'gusto', ${tokenData.access_token || null}, ${tokenData.refresh_token || null}, now(), now())
            ON CONFLICT (user_id, provider)
            DO UPDATE SET 
              access_token = EXCLUDED.access_token,
              refresh_token = EXCLUDED.refresh_token,
              updated_at = now();
          `;

          console.log("✅ Stored Gusto tokens for user", userId);
        } catch (dbError) {
          console.error("⚠️ Failed to persist Gusto tokens; continuing redirect", dbError);
        }
      }
    } else {
      console.warn("⚠️ No userId (state) provided; skipping token persistence");
    }

    // 5. The "Bounce Page" Response (Status 200 HTML) with cache-busting param
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

