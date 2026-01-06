import { Handler } from "@netlify/functions";
import postgres from "postgres";

// Connect to DB using the raw driver (bypassing Drizzle config issues)
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

export const handler: Handler = async (event) => {
  // 1. Get User ID from query params
  const userId = event.queryStringParameters?.userId;
  
  if (!userId) {
    return { statusCode: 400, body: "Missing userId" };
  }

  try {
    // 2. Fetch the Token (Raw SQL)
    // We look for the 'gusto' provider for this user
    const tokens = await sql`
      SELECT "accessToken" 
      FROM "Integration" 
      WHERE "userId" = ${userId} AND "provider" = 'gusto'
      LIMIT 1
    `;

    if (tokens.length === 0) {
      // No connection found -> Return "Disconnected" state
      return { 
        statusCode: 200, 
        body: JSON.stringify({ isConnected: false, payrolls: [] }) 
      };
    }

    const accessToken = tokens[0].accessToken;

    // 3. Call Gusto API
    // A. Get "Me" to find the Company ID
    const meRes = await fetch("https://api.gusto-demo.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!meRes.ok) throw new Error("Gusto 'Me' Failed");
    const meData = await meRes.json();
    
    // safe navigation to company id
    const companyId = meData.roles?.payroll_admin?.[0]?.companies?.[0]?.id;

    if (!companyId) {
       return { statusCode: 200, body: JSON.stringify({ isConnected: true, error: "No Company Found" }) };
    }

    // B. Get Payrolls
    const payrollsRes = await fetch(`https://api.gusto-demo.com/v1/companies/${companyId}/payrolls`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const payrolls = await payrollsRes.json();

    // 4. Return Real Data
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isConnected: true,
        companyId,
        payrolls: Array.isArray(payrolls) ? payrolls : []
      }),
    };

  } catch (error) {
    console.error("API Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: String(error) }) };
  }
};

