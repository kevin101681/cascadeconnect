import OpenAI from "openai";
import { getAIModelConfig } from "./app-settings";

// Lazy initialization
let openai: OpenAI | null = null;

const getOpenAI = () => {
  if (openai) return openai;
  
  const apiKey = process.env.OPENAI_API_KEY || (import.meta as any).env?.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️ OpenAI API key not found.");
    return null;
  }
  
  openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Only if running client-side, ideally this is server-side
  });
  
  return openai;
};

export const askMaintenanceAI = async (question: string): Promise<string> => {
  const client = getOpenAI();
  
  if (!client) {
    return "I'm currently unavailable. Please contact Cascade Builder Services directly.";
  }

  if (!question || question.trim().length === 0) {
    return "Please enter a question about home maintenance.";
  }

  try {
    // Get current AI model configuration from database
    const model = await getAIModelConfig();
    
    console.log(`🤖 Using AI model: ${model}`);

    const completion = await client.chat.completions.create({
      model: model, // Dynamic model from database
      messages: [
        {
          role: "system",
          content: `You are a helpful home maintenance expert for Cascade Builder Services.

FORMATTING RULE: Do NOT use markdown formatting (no asterisks, no bolding, no bullet points with stars). Use simple dashes (-) for lists if needed. Keep responses clean and plain text only.

CRITICAL RULE: NEVER tell the homeowner to "contact the builder" or "call the builder".
INSTEAD: Always tell them to "Contact Cascade Builder Services" or "submit a request to Cascade".

EMERGENCY RESPONSE PROTOCOL:
If the question is about an EMERGENCY (gas leak, water leak, electrical hazard, fire, carbon monoxide, etc.):
- Instruct: "Shut off the source immediately if safe to do so."
- Then say: "Call Cascade Builder Services Emergency Line right away."
- If evacuation is needed: "Evacuate immediately and call 911, then notify Cascade Builder Services."

URGENT ISSUES (Leaks, HVAC during extreme weather, electrical problems):
- Instruct: "Turn off the main supply/breaker if safe."
- Then say: "Contact Cascade Builder Services immediately for emergency service."

NON-EMERGENCY QUESTIONS:
- Provide clear, actionable steps (2-3 sentences max)
- Be specific about tools or materials needed
- Keep answers practical and concise
- Do NOT add a generic closing phrase telling them to schedule service
- ONLY suggest contacting Cascade Builder Services if the specific task requires a licensed professional (electrical work, HVAC repairs, plumbing beyond simple fixes) or is dangerous
- If the homeowner can reasonably fix it themselves with your instructions, just give the instructions without any contact recommendation
- Do not mention you are an AI`
        },
        { role: "user", content: question }
      ],
    });

    return completion.choices[0].message.content || "I couldn't generate an answer. Please try rephrasing your question or contact Cascade Builder Services for assistance.";
    
  } catch (error: any) {
    console.error("🔥 OpenAI Error:", error);
    return "I'm having trouble connecting to the service. Please try again or contact Cascade Builder Services for assistance.";
  }
};
