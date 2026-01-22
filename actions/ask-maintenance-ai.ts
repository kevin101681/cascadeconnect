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
    return "I'm sorry, I'm currently unavailable. For immediate assistance with maintenance questions, please contact your builder or check your homeowner manual.";
  }
  
  // Validate input
  if (!question || question.trim().length === 0) {
    return "Please enter a question about home maintenance.";
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: `You are a helpful home maintenance expert. Answer the homeowner's question concisely (2-3 sentences max). Focus on safety and practical steps. Do not mention you are an AI.

IMPORTANT SAFETY RULES:
- If the question is about an EMERGENCY (gas leak, water leak, electrical hazard, fire, carbon monoxide, etc.), advise them to call their builder IMMEDIATELY and evacuate if necessary.
- If the question is about a LEAK (water, gas, etc.), advise them to shut off the main supply and call their builder immediately.
- If the question is about ELECTRICAL issues, advise them to turn off the breaker and call a professional.
- For HVAC issues during extreme weather, emphasize urgency.

For non-emergency questions:
- Provide clear, actionable steps
- Be specific about tools or materials needed
- Recommend professional help when appropriate
- Keep the answer under 3 sentences

Homeowner's Question: "${question}"

Your Answer (2-3 sentences max):`,
    });
    
    return response.text || "I couldn't generate an answer. Please try rephrasing your question or contact your builder for assistance.";
  } catch (error) {
    console.error("Gemini API Error (askMaintenanceAI):", error);
    return "I'm having trouble processing your request right now. Please try again later or contact your builder for assistance.";
  }
};
