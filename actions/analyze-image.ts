/**
 * Server Action: Analyze Warranty Image with OpenAI GPT-5.2 Vision
 * January 22, 2026
 * 
 * Analyzes warranty claim images using OpenAI GPT-5.2 Vision
 * to generate professional titles and descriptions.
 */

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
  const response = await fetch("/.netlify/functions/ai-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, currentDescription }),
  });

  if (!response.ok) {
    throw new Error("AI request failed");
  }

  return (await response.json()) as AnalysisResult;
}
