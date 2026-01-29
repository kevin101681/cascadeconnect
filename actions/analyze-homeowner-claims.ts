/**
 * Server Action: Homeowner Warranty Coverage Preview
 * January 22, 2026
 * 
 * Analyzes homeowner claim descriptions to provide educational feedback
 * about typical warranty coverage. Uses a soft, non-binding tone.
 */

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
  try {
    const response = await fetch("/.netlify/functions/ai-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claims }),
    });

    if (!response.ok) {
      throw new Error("AI request failed");
    }

    const data = (await response.json()) as { html?: string };
    if (!data.html) throw new Error("Invalid AI response");

    return data.html;
    
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
