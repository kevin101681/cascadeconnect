import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy initialization
let genAI: GoogleGenerativeAI | null = null;

const getAI = () => {
  if (genAI) return genAI;
  
  // Support both Client (Vite) and Server (Process) env vars
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                 (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
  
  if (!apiKey) {
    console.warn("⚠️ Gemini API key not found.");
    return null;
  }
  
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
  } catch (error) {
    console.error("Failed to initialize Gemini:", error);
    return null;
  }
};

export const askMaintenanceAI = async (question: string): Promise<string> => {
  const ai = getAI();
  
  if (!ai) {
    return "I'm currently unavailable. Please contact Cascade Builder Services directly.";
  }
  
  if (!question || question.trim().length === 0) {
    return "Please enter a question about home maintenance.";
  }
  
  try {
    // Use the Stable Model
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a helpful home maintenance expert for Cascade Builder Services.

CRITICAL RULE: NEVER tell the homeowner to "contact the builder".
INSTEAD: Always tell them to "Contact Cascade Builder Services".

EMERGENCY RESPONSE:
If (gas leak, water leak, fire, sparks):
- "Shut off source immediately if safe."
- "Call Cascade Builder Services Emergency Line."
- "If life-threatening, call 911."

NON-EMERGENCY:
- Provide clear, actionable steps (2-3 sentences).
- If professional help needed: "Contact Cascade Builder Services to schedule an appointment."

Question: "${question}"
Answer:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error: any) {
    console.error("🔥 Gemini Error:", error);
    return "I'm having trouble processing that request. Please try again or contact support.";
  }
};
