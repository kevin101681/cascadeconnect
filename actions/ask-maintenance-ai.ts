import { GoogleGenAI } from "@google/genai";

// Lazy initialization - only create AI instance when needed and API key is available
let aiInstance: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI | null => {
  if (aiInstance) return aiInstance;
  
  // Get API key from environment variables (server-side)
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️ Gemini API key not found. AI features will use fallback responses.");
    return null;
  }
  
  try {
    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
  } catch (error) {
    console.error("Failed to initialize Gemini AI:", error);
    return null;
  }
};

/**
 * Server action to answer homeowner maintenance questions using AI
 * 
 * @param question - The maintenance question from the homeowner
 * @returns A concise, helpful answer (2-3 sentences)
 */
export const askMaintenanceAI = async (question: string): Promise<string> => {
  const ai = getAI();
  
  if (!ai) {
    // Fallback response if AI is not available
    return "I'm sorry, I'm currently unavailable. For immediate assistance with maintenance questions, please contact Cascade Builder Services.";
  }
  
  // Validate input
  if (!question || question.trim().length === 0) {
    return "Please enter a question about home maintenance.";
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: `You are a helpful home maintenance expert for Cascade Builder Services.

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
- If professional help is needed, say: "For this repair, contact Cascade Builder Services to schedule a service appointment."
- Keep answers practical and concise
- Do not mention you are an AI

Homeowner's Question: "${question}"

Your Answer (2-3 sentences max):`,
    });
    
    return response.text || "I couldn't generate an answer. Please try rephrasing your question or contact Cascade Builder Services for assistance.";
  } catch (error) {
    console.error("Gemini API Error (askMaintenanceAI):", error);
    return "I'm having trouble processing your request right now. Please try again later or contact Cascade Builder Services for assistance.";
  }
};
