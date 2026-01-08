/**
 * AI WARRANTY REVIEWER
 * Uses OpenAI GPT-4o to analyze claims against warranty guidelines
 * January 7, 2026
 */

import OpenAI from 'openai';

// Warranty Guidelines Reference
const WARRANTY_GUIDELINES = `
CASCADE CONNECT STANDARD WARRANTY GUIDELINES

STRUCTURAL COVERAGE:
- Foundation cracks wider than 3/16 inch: COVERED for first 10 years
- Foundation cracks less than 3/16 inch: NOT COVERED (cosmetic)
- Settlement cracks in walls/ceilings less than 1/4 inch: NOT COVERED
- Major structural defects: COVERED for 10 years

EXTERIOR COVERAGE:
- Siding defects due to poor installation: COVERED for 2 years
- Siding damage from weather/homeowner negligence: NOT COVERED
- Paint peeling within 1 year: COVERED (manufacturing defect)
- Paint fading/weathering: NOT COVERED (normal wear)
- Roof leaks due to installation defect: COVERED for 2 years
- Storm damage to roof: NOT COVERED (insurance claim)

INTERIOR COVERAGE:
- Nail pops: COVERED in first year only
- Drywall cracks less than 1/8 inch: NOT COVERED (cosmetic)
- Paint touch-ups: NOT COVERED (homeowner responsibility)
- Floor squeaks: COVERED in first year only
- Cabinet hardware loose: COVERED in first 90 days
- Countertop seams visible: NOT COVERED (normal condition)

PLUMBING COVERAGE:
- Leaks due to defective installation: COVERED for 2 years
- Clogged drains from homeowner use: NOT COVERED
- Water heater defects: COVERED for 1 year (also check manufacturer warranty)
- Fixture finishes wearing: NOT COVERED (normal wear)

ELECTRICAL COVERAGE:
- Faulty wiring/installation: COVERED for 2 years
- Tripped breakers from overload: NOT COVERED (usage issue)
- Light fixture defects: COVERED for 1 year
- Burnt out bulbs: NOT COVERED (homeowner responsibility)

HVAC COVERAGE:
- System defects/poor installation: COVERED for 2 years
- Lack of regular maintenance: NOT COVERED (voids warranty)
- Filter replacement: NOT COVERED (homeowner responsibility)
- Thermostat batteries: NOT COVERED (homeowner responsibility)

GENERAL EXCLUSIONS:
- Normal wear and tear
- Homeowner negligence or misuse
- Lack of required maintenance
- Damage from severe weather/acts of God
- Cosmetic issues that don't affect function
- Items beyond specified warranty period
`;

interface AIReviewResult {
  status: 'Approved' | 'Denied' | 'Needs Info';
  reasoning: string;
  responseDraft: string;
}

/**
 * Analyze a warranty claim using OpenAI
 * @param claimTitle - The title/summary of the claim
 * @param claimDescription - Detailed description of the issue
 * @returns AI analysis with approval recommendation and response draft
 */
export async function analyzeClaim(
  claimTitle: string,
  claimDescription: string
): Promise<AIReviewResult> {
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
    });

    console.log('🤖 Analyzing claim with AI:', claimTitle);

    // Create the prompt for GPT-4o
    const systemPrompt = `You are a strict but polite Warranty Officer for a home builder called CASCADE CONNECT. 

Your job is to review warranty claims against the provided Warranty Guidelines.

For each claim, you must:
1. Determine if it should be APPROVED, DENIED, or if you NEED MORE INFO based strictly on the guidelines.
2. Cite the specific guideline rule that applies.
3. Write a polite, professional response for the homeowner explaining the decision.

Be firm but empathetic. If denying a claim, suggest alternatives (e.g., "While this isn't covered under warranty, you may want to contact your homeowner's insurance").

Format your response as JSON with these exact fields:
{
  "status": "Approved" | "Denied" | "Needs Info",
  "reasoning": "Brief explanation of why, citing specific guideline",
  "responseDraft": "The full response text for the homeowner"
}`;

    const userPrompt = `WARRANTY GUIDELINES:
${WARRANTY_GUIDELINES}

CLAIM TO REVIEW:
Title: ${claimTitle}
Description: ${claimDescription}

Please analyze this claim and provide your recommendation.`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent, factual responses
      max_tokens: 1000,
    });

    // Parse the AI response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content) as AIReviewResult;

    console.log('✅ AI Analysis complete:', result.status);
    return result;
  } catch (error) {
    console.error('❌ Error analyzing claim with AI:', error);
    
    // Return a fallback response if AI fails
    return {
      status: 'Needs Info',
      reasoning: 'AI analysis failed. Please review manually.',
      responseDraft: 'We are currently reviewing your warranty claim and will respond within 2-3 business days. Thank you for your patience.',
    };
  }
}

