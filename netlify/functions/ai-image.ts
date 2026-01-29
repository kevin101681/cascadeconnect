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

interface ImageRequestBody {
  imageUrl?: string;
  currentDescription?: string;
}

interface AnalysisResult {
  title: string;
  description: string;
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
    const body: ImageRequestBody = JSON.parse(event.body || "{}");
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const currentDescription =
      typeof body.currentDescription === "string" ? body.currentDescription : undefined;

    if (!imageUrl.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing imageUrl" }),
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

    let textPrompt: string;
    if (currentDescription && currentDescription.trim()) {
      textPrompt = `You are a helpful home warranty assistant.

The user has uploaded an image and provided these notes:
"${currentDescription}"

Task: Analyze the image and the user's notes. Write a clear, concise title and a 2-3 sentence description of the issue shown.
Use the user's notes as a base but make the description clearer and more professional.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):
{"title": "Brief issue title here", "description": "2-3 sentence professional description here"}`;
    } else {
      textPrompt = `You are a helpful home warranty assistant.

Task: Analyze the image and identify the home warranty issue shown. Write a clear, concise title and a 2-3 sentence description of the issue.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):
{"title": "Brief issue title here", "description": "2-3 sentence professional description here"}`;
    }

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from AI");
    }

    let cleanedResponse = responseText.trim();
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    const parsed = JSON.parse(cleanedResponse) as AnalysisResult;
    if (!parsed.title || !parsed.description) {
      throw new Error("Invalid response format from AI");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        title: parsed.title.trim(),
        description: parsed.description.trim(),
      }),
    };
  } catch (error) {
    console.error("ai-image error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "AI request failed" }),
    };
  }
};

