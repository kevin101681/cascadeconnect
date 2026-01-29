import { Handler } from "@netlify/functions";
import OpenAI from "openai";
import { neon } from "@neondatabase/serverless";
import { WARRANTY_GUIDELINES } from "../../constants/warranty-provisions";

// Get AI model config from database
async function getAIModelConfig(): Promise<string> {
  try {
    if (!process.env.DATABASE_URL) return "gpt-5.2";
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT value FROM app_settings WHERE key = 'ai_model' LIMIT 1`;
    return (result as any)[0]?.value || "gpt-5.2"; // Default to gpt-5.2
  } catch (error) {
    console.error("Error fetching AI model config:", error);
    return "gpt-5.2"; // Fallback to default
  }
}

interface ClaimDescription {
  title: string;
  description: string;
}

interface ClaimsRequestBody {
  claims?: ClaimDescription[];
}

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body: ClaimsRequestBody = JSON.parse(event.body || "{}");
    const claims = Array.isArray(body.claims) ? body.claims : [];

    if (claims.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing claims" }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server not configured" }),
      };
    }

    const openai = new OpenAI({ apiKey });
    const model = await getAIModelConfig();

    const claimsText = claims
      .map((claim, index) => `Claim ${index + 1}: ${claim.title}\n${claim.description}`)
      .join("\n\n");

    const systemPrompt = `You are a helpful, educational Warranty Assistant for homeowners.

Your role is to provide PRELIMINARY, INFORMATIVE guidance about what is typically covered under standard builder warranties. This is NOT a final decision.

CRITICAL INSTRUCTIONS:
1. TONE: Be friendly, educational, and reassuring. Use phrases like:
   - "Typically covered under warranty"
   - "Usually considered homeowner maintenance"
   - "May require investigation by our team"
   - "Generally falls under warranty provisions"
   
2. FORMATTING:
   - DO NOT cite specific section numbers (no "Section 4.2", "Section IX", etc.)
   - DO NOT use the words "Approved" or "Denied"
   - DO NOT use legal or overly technical language
   - Use simple, clear language a homeowner would understand
   
3. STRUCTURE YOUR RESPONSE AS HTML:
   - Start with a friendly intro explaining this is preliminary guidance
   - Group items into TWO categories if applicable:
     * "Items Typically Covered by Warranty" (green-tinted section)
     * "Items That May Be Homeowner Maintenance" (blue-tinted section)
   - Use bullet points with clear descriptions
   - End with a reassuring note that a specialist will review everything
   
4. BE NON-BINDING: Always emphasize these are general guidelines, not final decisions.

5. OUTPUT FORMAT: Return clean HTML with Tailwind CSS classes (use dark mode variants). Example structure:

<div class="space-y-4">
  <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
    Based on your descriptions, here is a summary of what is typically covered under a standard warranty vs. what is usually considered homeowner maintenance. <strong>These are not final decisions</strong>, just informative guidance.
  </p>
  
  <!-- Likely Covered Section -->
  <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg p-4">
    <h4 class="font-semibold text-green-900 dark:text-green-100 mb-2">Items Typically Covered by Warranty</h4>
    <ul class="space-y-2 text-sm text-green-800 dark:text-green-200">
      <li><strong>Issue Name:</strong> Brief explanation of why this is typically covered</li>
    </ul>
  </div>
  
  <!-- Maintenance Section (if applicable) -->
  <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
    <h4 class="font-semibold text-blue-900 dark:text-blue-100 mb-2">Items That May Be Homeowner Maintenance</h4>
    <ul class="space-y-2 text-sm text-blue-800 dark:text-blue-200">
      <li><strong>Issue Name:</strong> Brief explanation of why this is usually maintenance</li>
    </ul>
  </div>
  
  <p class="text-xs text-gray-600 dark:text-gray-500 italic">
    Our warranty team will review your claims and provide a detailed response within 1-2 business days.
  </p>
</div>

REFERENCE MANUAL (Use this to make your assessment):
${WARRANTY_GUIDELINES}
`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Please analyze these warranty claims:\n\n${claimsText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const htmlResponse = completion.choices[0]?.message?.content;
    if (!htmlResponse) {
      throw new Error("No response from AI");
    }

    let cleanedHtml = htmlResponse.trim();
    cleanedHtml = cleanedHtml.replace(/```html\n?/g, "").replace(/```\n?/g, "");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ html: cleanedHtml }),
    };
  } catch (error) {
    console.error("ai-claims error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "AI request failed" }),
    };
  }
};

