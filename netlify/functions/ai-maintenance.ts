import { Handler } from "@netlify/functions";
import OpenAI from "openai";
import { neon } from "@neondatabase/serverless";

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

export interface MaintenanceAIResponse {
  answer: string;
  action: "CLAIM" | "MESSAGE" | "INFO" | "HELP_TAB";
  suggestedTitle?: string;
  suggestedDescription?: string;
  suggestedSubject?: string;
  suggestedMessage?: string;
}

interface MaintenanceRequestBody {
  prompt?: string;
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
    const body: MaintenanceRequestBody = JSON.parse(event.body || "{}");
    const prompt = typeof body.prompt === "string" ? body.prompt : "";

    if (!prompt.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing prompt" }),
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

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a helpful home maintenance expert for Cascade Builder Services.

FORMATTING RULE: Do NOT use markdown formatting (no asterisks, no bolding, no bullet points with stars). Use simple dashes (-) for lists if needed. Keep responses clean and plain text only.

CRITICAL RULE: NEVER tell the homeowner to "contact the builder" or "call the builder".
INSTEAD: Always tell them to "Contact Cascade Builder Services" or "submit a request to Cascade".

INTENT CLASSIFICATION RULE:
Analyze the user's issue and classify it into one of these categories:
- CLAIM: If it appears to be a broken item, defect, warranty failure, damage, or something not working properly that likely requires repair or replacement (e.g., "My pipe burst", "The furnace is broken", "There's a crack in the wall", "The door won't close").
- MESSAGE: If it is a scheduling request, general question requiring human follow-up, complex issue needing builder assistance, or requests for information that can't be self-serviced (e.g., "Can I schedule a walkthrough?", "When will the builder visit?", "I need to discuss modifications").
- INFO: If it is a simple how-to question, maintenance tip, or DIY instruction that you can fully answer (e.g., "How do I change my filter?", "How often should I clean the vents?").

EMERGENCY RESPONSE PROTOCOL:
If the question is about an EMERGENCY (gas leak, water leak, electrical hazard, fire, carbon monoxide, etc.):
- Instruct: "Shut off the source immediately if safe to do so."
- Then say: "Call Cascade Builder Services Emergency Line right away."
- If evacuation is needed: "Evacuate immediately and call 911, then notify Cascade Builder Services."
- Classify as: CLAIM (since it's a damage/failure requiring immediate attention)

URGENT ISSUES (Leaks, HVAC during extreme weather, electrical problems):
- Instruct: "Turn off the main supply/breaker if safe."
- Then say: "Contact Cascade Builder Services immediately for emergency service."
- Classify as: CLAIM

NON-EMERGENCY QUESTIONS:
- Provide clear, actionable steps (2-3 sentences max)
- Be specific about tools or materials needed
- Keep answers practical and concise
- Do NOT add a generic closing phrase telling them to schedule service
- ONLY suggest contacting Cascade Builder Services if the specific task requires a licensed professional (electrical work, HVAC repairs, plumbing beyond simple fixes) or is dangerous
- If the homeowner can reasonably fix it themselves with your instructions, just give the instructions without any contact recommendation
- Do not mention you are an AI

OUTPUT FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "answer": "Your plain text answer here...",
  "action": "CLAIM" | "MESSAGE" | "INFO",
  "suggestedTitle": "3-5 word summary (ONLY if action is CLAIM)",
  "suggestedDescription": "Professional summary of the issue (ONLY if action is CLAIM)",
  "suggestedSubject": "Brief subject line (ONLY if action is MESSAGE)",
  "suggestedMessage": "Pre-filled message body (ONLY if action is MESSAGE)"
}

SMART PRE-FILL RULES:
- If action is "CLAIM": Include suggestedTitle (3-5 words, e.g., "Leaking Kitchen Sink") and suggestedDescription (2-3 sentences describing the issue professionally).
  * CRITICAL: Write the 'suggestedDescription' in FIRST PERSON from the homeowner's perspective (e.g., "I have a water leak under my kitchen sink. I tried tightening the trap but the issue persists." NOT "Homeowner reports active water leak...").
- If action is "MESSAGE": Include suggestedSubject (brief subject line) and suggestedMessage (pre-written message body requesting assistance).
- If action is "INFO" or "HELP_TAB": Do NOT include any suggested fields.

Do NOT include any text outside the JSON object. The response must be parseable JSON.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const responseText =
      completion.choices[0]?.message?.content ||
      '{"answer":"I couldn\\u0027t generate an answer. Please try again later.","action":"MESSAGE"}';

    const parsed = JSON.parse(responseText) as MaintenanceAIResponse;

    if (!parsed.answer || !parsed.action) {
      throw new Error("Invalid response structure");
    }

    if (!["CLAIM", "MESSAGE", "INFO", "HELP_TAB"].includes(parsed.action)) {
      parsed.action = "INFO";
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed),
    };
  } catch (error) {
    console.error("ai-maintenance error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "AI request failed" }),
    };
  }
};

