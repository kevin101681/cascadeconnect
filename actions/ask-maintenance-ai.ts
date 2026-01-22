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

export interface MaintenanceAIResponse {
  answer: string;
  action: 'CLAIM' | 'MESSAGE' | 'INFO' | 'HELP_TAB';
  // Smart Pre-fill fields (optional)
  suggestedTitle?: string;
  suggestedDescription?: string;
  suggestedSubject?: string;
  suggestedMessage?: string;
}

export const askMaintenanceAI = async (question: string): Promise<MaintenanceAIResponse> => {
  const client = getOpenAI();
  
  if (!client) {
    return {
      answer: "I'm currently unavailable. Please contact Cascade Builder Services directly.",
      action: 'MESSAGE'
    };
  }

  if (!question || question.trim().length === 0) {
    return {
      answer: "Please enter a question about home maintenance.",
      action: 'INFO'
    };
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

EXAMPLES:
Claim Example:
{
  "answer": "This sounds like a plumbing issue that requires immediate attention...",
  "action": "CLAIM",
  "suggestedTitle": "Water Leak Under Kitchen Sink",
  "suggestedDescription": "I have a water leak under my kitchen sink. I tried tightening the trap but the issue persists. The leak appears to be coming from the drain connection."
}

Message Example:
{
  "answer": "I recommend reaching out to schedule a walkthrough...",
  "action": "MESSAGE",
  "suggestedSubject": "Schedule Walkthrough Request",
  "suggestedMessage": "Hello, I would like to schedule a walkthrough to discuss some questions about my home. Please let me know your available times. Thank you!"
}

Do NOT include any text outside the JSON object. The response must be parseable JSON.`
        },
        { role: "user", content: question }
      ],
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content || '{"answer": "I couldn\'t generate an answer. Please try rephrasing your question or contact Cascade Builder Services for assistance.", "action": "MESSAGE"}';
    
    try {
      const parsed = JSON.parse(responseText) as MaintenanceAIResponse;
      
      // Validate the response has required fields
      if (!parsed.answer || !parsed.action) {
        throw new Error('Invalid response structure');
      }
      
      // Validate action is one of the expected values
      if (!['CLAIM', 'MESSAGE', 'INFO', 'HELP_TAB'].includes(parsed.action)) {
        parsed.action = 'INFO';
      }
      
      console.log('✅ AI Response:', { action: parsed.action, answerLength: parsed.answer.length });
      
      return parsed;
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      return {
        answer: responseText,
        action: 'INFO'
      };
    }
    
  } catch (error: any) {
    console.error("🔥 OpenAI Error:", error);
    return {
      answer: "I'm having trouble connecting to the service. Please try again or contact Cascade Builder Services for assistance.",
      action: 'MESSAGE'
    };
  }
};
