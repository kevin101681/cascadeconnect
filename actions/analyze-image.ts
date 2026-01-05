/**
 * Server Action: Analyze Warranty Image with Gemini AI
 * January 4, 2026
 * 
 * Analyzes warranty claim images using Google Gemini AI
 * to generate professional titles and descriptions.
 */

import { GoogleGenAI } from "@google/genai";

// Lazy initialization
let aiInstance: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI | null => {
  if (aiInstance) return aiInstance;
  
  // Get API key from Vite environment (client-side)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️ Gemini API key not found. AI image analysis unavailable.");
    console.warn("Make sure VITE_GEMINI_API_KEY is set in your .env.local file");
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

interface AnalysisResult {
  title: string;
  description: string;
}

/**
 * Analyze a warranty image and optionally refine existing description
 * @param imageUrl - Cloudinary URL of the image
 * @param currentDescription - Optional existing description to refine
 * @returns Object with title and description
 */
export async function analyzeWarrantyImage(
  imageUrl: string,
  currentDescription?: string
): Promise<AnalysisResult> {
  const ai = getAI();
  
  if (!ai) {
    throw new Error("AI service not available. Please check API key configuration.");
  }

  try {
    // Fetch image from URL and convert to base64
    console.log('📥 Fetching image from:', imageUrl);
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    console.log('🤖 Analyzing image with Gemini AI...');
    
    // Build prompt based on whether we're creating new or refining existing description
    let prompt: string;
    if (currentDescription && currentDescription.trim()) {
      prompt = `You are a helpful home warranty assistant.

The user has uploaded an image and provided these notes:
"${currentDescription}"

Task: Analyze the image and the user's notes. Write a clear, concise title and a 2-3 sentence description of the issue shown.
Use the user's notes as a base but make the description clearer and more professional.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):
{"title": "Brief issue title here", "description": "2-3 sentence professional description here"}`;
    } else {
      prompt = `You are a helpful home warranty assistant.

Task: Analyze the image and identify the home warranty issue shown. Write a clear, concise title and a 2-3 sentence description of the issue.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):
{"title": "Brief issue title here", "description": "2-3 sentence professional description here"}`;
    }
    
    // Call Gemini API with image and prompt
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    const responseText = result.text;
    
    if (!responseText) {
      throw new Error("No response from AI");
    }

    console.log('✅ AI analysis complete');
    
    // Parse JSON response
    // Remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const parsed: AnalysisResult = JSON.parse(cleanedResponse);
    
    // Validate response structure
    if (!parsed.title || !parsed.description) {
      throw new Error("Invalid response format from AI");
    }
    
    return {
      title: parsed.title.trim(),
      description: parsed.description.trim()
    };
    
  } catch (error) {
    console.error("❌ Error analyzing image:", error);
    
    // Provide more helpful error messages
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse AI response. Please try again.");
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error("An unexpected error occurred during image analysis.");
  }
}

