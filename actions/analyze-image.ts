/**
 * Server Action: Analyze Warranty Image with OpenAI GPT-5.2 Vision
 * January 22, 2026
 * 
 * Analyzes warranty claim images using OpenAI GPT-5.2 Vision
 * to generate professional titles and descriptions.
 */

import OpenAI from "openai";
import { getAIModelConfig } from "./app-settings";

// Lazy initialization
let openai: OpenAI | null = null;

const getOpenAI = () => {
  if (openai) return openai;
  
  // Get API key from environment variables
  const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || 
                 (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);
  
  if (!apiKey) {
    console.warn("⚠️ OpenAI API key not found. AI image analysis unavailable.");
    console.warn("Make sure VITE_OPENAI_API_KEY is set in your .env file");
    return null;
  }
  
  try {
    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Allow client-side usage
    });
    return openai;
  } catch (error) {
    console.error("Failed to initialize OpenAI:", error);
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
  const client = getOpenAI();
  
  if (!client) {
    throw new Error("AI service not available. Please check API key configuration.");
  }

  try {
    console.log('🤖 Analyzing image with OpenAI Vision...');
    
    // Get current AI model configuration from database
    const model = await getAIModelConfig();
    
    console.log(`🤖 Using AI model: ${model}`);
    
    // Build prompt based on whether we're creating new or refining existing description
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
    
    // Call OpenAI API with vision support
    const completion = await client.chat.completions.create({
      model: model, // Dynamic model from database
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: textPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high" // High detail for better analysis
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error("No response from AI");
    }

    console.log('✅ AI analysis complete');
    
    // Parse JSON response
    // Remove markdown code blocks if present (shouldn't be needed with response_format)
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
