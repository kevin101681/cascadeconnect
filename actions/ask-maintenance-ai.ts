import { GoogleGenAI } from "@google/genai";

// Lazy initialization - only create AI instance when needed and API key is available
let aiInstance: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI | null => {
  if (aiInstance) return aiInstance;
  
  // 🔍 VERBOSE: Check all possible API key sources
  console.log("🔍 Checking for Gemini API key...");
  
  // Get API key from environment variables (try multiple sources)
  const apiKey = 
    (import.meta as any).env?.VITE_GEMINI_API_KEY || 
    (typeof process !== 'undefined' ? process.env.VITE_GEMINI_API_KEY : undefined) ||
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) ||
    (typeof process !== 'undefined' ? process.env.GOOGLE_API_KEY : undefined);
  
  if (!apiKey) {
    console.error("❌ CRITICAL: No Gemini API Key found in environment variables.");
    console.error("Checked sources:", {
      'import.meta.env.VITE_GEMINI_API_KEY': !!(import.meta as any).env?.VITE_GEMINI_API_KEY,
      'process.env.VITE_GEMINI_API_KEY': !!(typeof process !== 'undefined' && process.env.VITE_GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': !!(typeof process !== 'undefined' && process.env.GEMINI_API_KEY),
      'process.env.GOOGLE_API_KEY': !!(typeof process !== 'undefined' && process.env.GOOGLE_API_KEY),
    });
    return null;
  }
  
  console.log("✅ API key found, initializing Gemini AI...");
  
  try {
    aiInstance = new GoogleGenAI({ apiKey });
    console.log("✅ Gemini AI initialized successfully");
    return aiInstance;
  } catch (error: any) {
    console.error("❌ Failed to initialize Gemini AI:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    return null;
  }
};

/**
 * Ask the AI maintenance assistant a question
 * 
 * @param question - The maintenance question from the homeowner
 * @returns A concise, helpful answer (2-3 sentences)
 */
export const askMaintenanceAI = async (question: string): Promise<string> => {
  console.log("🤖 askMaintenanceAI called with question:", question.substring(0, 50) + "...");
  
  const ai = getAI();
  
  if (!ai) {
    console.error("❌ AI instance not available (API key missing or initialization failed)");
    // Fallback response if AI is not available
    return "I'm sorry, I'm currently unavailable. For immediate assistance with maintenance questions, please contact Cascade Builder Services.";
  }
  
  // Validate input
  if (!question || question.trim().length === 0) {
    console.warn("⚠️ Empty question provided");
    return "Please enter a question about home maintenance.";
  }
  
  try {
    console.log("📤 Sending request to Gemini API...");
    console.log("🎯 Using model: gemini-3.0-flash-preview");
    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash-preview',
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
    
    console.log("📥 Received response from Gemini API");
    const answer = response.text || "I couldn't generate an answer. Please try rephrasing your question or contact Cascade Builder Services for assistance.";
    console.log("✅ Successfully generated answer:", answer.substring(0, 50) + "...");
    
    return answer;
  } catch (error: any) {
    console.error("🔥 Gemini API Failure Details:", {
      message: error.message,
      name: error.name,
      status: error.status,
      statusText: error.statusText,
      code: error.code,
      details: error.errorDetails || error.details,
      response: error.response,
      stack: error.stack,
      fullError: error,
    });
    
    // Return a more informative error message for debugging
    const errorMsg = error.message || "Unknown error";
    console.error(`❌ AI Service Error: ${errorMsg}`);
    
    return "I'm having trouble processing your request right now. Please try again later or contact Cascade Builder Services for assistance.";
  }
};
