/**
 * Server Action: Homeowner Warranty Coverage Preview
 * January 22, 2026
 * 
 * Analyzes homeowner claim descriptions to provide educational feedback
 * about typical warranty coverage. Uses a soft, non-binding tone.
 */

import OpenAI from "openai";
import { getAIModelConfig } from "./app-settings";
import { WARRANTY_GUIDELINES } from "../constants/warranty-provisions";

// Lazy initialization
let openai: OpenAI | null = null;

const getOpenAI = () => {
  if (openai) return openai;
  
  // Get API key from environment variables
  const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || 
                 (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);
  
  if (!apiKey) {
    console.warn("⚠️ OpenAI API key not found for homeowner warranty preview");
    return null;
  }
  
  try {
    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
    return openai;
  } catch (error) {
    console.error("Failed to initialize OpenAI for warranty preview:", error);
    return null;
  }
};

interface ClaimDescription {
  title: string;
  description: string;
}

/**
 * Analyze homeowner claims for warranty coverage preview
 * @param claims - Array of claim descriptions
 * @returns HTML string with homeowner-friendly coverage summary
 */
export async function analyzeHomeownerClaims(
  claims: ClaimDescription[]
): Promise<string> {
  const client = getOpenAI();
  
  if (!client) {
    return `
      <div class="text-center py-4">
        <p class="text-gray-600 dark:text-gray-400">
          Coverage preview is temporarily unavailable. Your claims have been submitted successfully 
          and our team will review them shortly.
        </p>
      </div>
    `;
  }

  try {
    // Get current AI model configuration from database
    const model = await getAIModelConfig();
    
    console.log(`🤖 Analyzing ${claims.length} claim(s) with model: ${model}`);

    // Format claims for the prompt
    const claimsText = claims.map((claim, index) => 
      `Claim ${index + 1}: ${claim.title}\n${claim.description}`
    ).join('\n\n');

    const systemPrompt = `You are a helpful, educational Warranty Assistant for homeowners.

Your role is to provide PRELIMINARY, INFORMATIVE guidance about what is typically covered under standard builder warranties. This is NOT a final decision.

CRITICAL INSTRUCTIONS:
1. TONE: Be friendly, educational, and reassuring. Use phrases like:
   - "Typically covered under warranty"
   - "Usually considered homeowner maintenance"
   - "May require investigation by our team"
   - "Generally falls under warranty provisions"
   
2. FORMATTING:
   - DO NOT cite specific section numbers (no "Section 4.2", "Section IX", etc.)
   - DO NOT use the words "Approved" or "Denied"
   - DO NOT use legal or overly technical language
   - Use simple, clear language a homeowner would understand
   
3. STRUCTURE YOUR RESPONSE AS HTML:
   - Start with a friendly intro explaining this is preliminary guidance
   - Group items into TWO categories if applicable:
     * "Items Typically Covered by Warranty" (green-tinted section)
     * "Items That May Be Homeowner Maintenance" (blue-tinted section)
   - Use bullet points with clear descriptions
   - End with a reassuring note that a specialist will review everything
   
4. BE NON-BINDING: Always emphasize these are general guidelines, not final decisions.

5. OUTPUT FORMAT: Return clean HTML with Tailwind CSS classes (use dark mode variants). Example structure:

<div class="space-y-4">
  <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
    Based on your descriptions, here is a summary of what is typically covered under a standard warranty vs. what is usually considered homeowner maintenance. <strong>These are not final decisions</strong>, just informative guidance.
  </p>
  
  <!-- Likely Covered Section -->
  <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg p-4">
    <h4 class="font-semibold text-green-900 dark:text-green-100 mb-2">Items Typically Covered by Warranty</h4>
    <ul class="space-y-2 text-sm text-green-800 dark:text-green-200">
      <li><strong>Issue Name:</strong> Brief explanation of why this is typically covered</li>
    </ul>
  </div>
  
  <!-- Maintenance Section (if applicable) -->
  <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
    <h4 class="font-semibold text-blue-900 dark:text-blue-100 mb-2">Items That May Be Homeowner Maintenance</h4>
    <ul class="space-y-2 text-sm text-blue-800 dark:text-blue-200">
      <li><strong>Issue Name:</strong> Brief explanation of why this is usually maintenance</li>
    </ul>
  </div>
  
  <p class="text-xs text-gray-600 dark:text-gray-500 italic">
    Our warranty team will review your claims and provide a detailed response within 1-2 business days.
  </p>
</div>

REFERENCE MANUAL (Use this to make your assessment):
${WARRANTY_GUIDELINES}
`;

    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please analyze these warranty claims:\n\n${claimsText}` }
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual responses
      max_tokens: 1000,
    });

    const htmlResponse = completion.choices[0]?.message?.content;
    
    if (!htmlResponse) {
      throw new Error("No response from AI");
    }

    console.log('✅ Warranty coverage preview generated successfully');
    
    // Clean up any markdown code blocks if present
    let cleanedHtml = htmlResponse.trim();
    cleanedHtml = cleanedHtml.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    
    return cleanedHtml;
    
  } catch (error) {
    console.error("❌ Error generating warranty coverage preview:", error);
    
    // Fallback response
    return `
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-4">
        <p class="text-sm text-yellow-900 dark:text-yellow-100">
          We're having trouble generating the coverage preview right now, but your claims have been 
          successfully submitted. Our warranty team will review them and get back to you within 1-2 business days.
        </p>
      </div>
    `;
  }
}
