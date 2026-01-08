'use server';

/**
 * AI WARRANTY REVIEWER
 * Uses OpenAI GPT-4o to analyze claims against 2-10 Home Buyers Warranty guidelines
 */

import OpenAI from 'openai';

// ------------------------------------------------------------------
// THE OFFICIAL WARRANTY MANUAL (Source Truth: US_W.DS.Sv2_11_2023)
// ------------------------------------------------------------------
const WARRANTY_GUIDELINES = `
OFFICIAL 2-10 HOME BUYERS WARRANTY BOOKLET (US_W.DS.Sv2_11_2023)

--- SECTION I. OVERVIEW OF YOUR WARRANTIES ---
WORKMANSHIP WARRANTY: Roof covering, cabinets, countertops, door panels, exterior siding, hardwood floors, basement floor, ceramic tile, drywall, interior trim, carpet, paint, and fireplace.
DISTRIBUTION SYSTEMS WARRANTY: Supply piping, waste piping, ductwork, and electrical wiring.
STRUCTURAL WARRANTY: Roof framing systems, load-bearing walls and partitions, beams, columns, footings and foundation systems, floor framing systems, girders, lintels, and masonry arches.

--- SECTION II. IMPORTANT NEW HOME MAINTENANCE ---
Maintenance is a key part of homeownership and can reduce defects and breakdowns.
You are responsible for proper maintenance. The builder/seller and warranty insurer are not responsible for problems that arise from failure to perform normal maintenance.
Key Tasks:
- HVAC filters: Change per schedule.
- HVAC system: Inspect annually.
- Grading: Maintain grading established by builder/seller to ensure water drains away from foundation.
- Concrete: Clean and preserve wood floors/wall finishes.
- Irrigation: Drain before freeze.

--- SECTION III. YOUR WORKMANSHIP WARRANTY ---
The workmanship warranty addresses the fit, finish, and materials used in the construction of your home.
YOU WAIVE YOUR RIGHT TO COVERAGE IF DEFECTS ARE NOT REPORTED WITHIN THE TIME LIMITATIONS.

--- SECTION IV. YOUR DISTRIBUTION SYSTEMS WARRANTY ---
Addresses how electrical, plumbing, and mechanical functions are delivered.

--- SECTION V. YOUR STRUCTURAL WARRANTY ---
Coverage for catastrophic failure of designated load-bearing elements.
STRUCTURAL DEFECT DEFINITION:
1. Actual physical damage to designated load-bearing elements.
2. Caused by failure of a designated load-bearing element.
3. Renders the home unsafe, unsanitary, or otherwise unlivable.

--- SECTION VIII. WORDS WITH SPECIAL MEANING ---
- DEFECT: A failure to meet the Construction Performance Guidelines in Section IX.
- STRUCTURAL DEFECT: Actual physical damage to load-bearing elements affecting function to the extent the home becomes unsafe, unsanitary, or unlivable.
- UNSAFE: Structural hazard wherein load-bearing elements can no longer safely carry design loads.
- UNLIVABLE: Actual physical damage with distress symptoms. Deflection > 1 inch in 30 feet OR Tilt > 1%.

--- SECTION IX. CONSTRUCTION PERFORMANCE GUIDELINES ---
(This section defines the specific tolerances for Approval vs Denial)

1. SITE WORK
1.1 GRADING
- Observation: Settling of ground around foundation.
- Guideline: Settling > 6 inches within 10 feet of foundation is a deficiency.
- Builder Responsibility: Fill settled areas one time only.
- Exclusion: Erosion due to homeowner failure to maintain grades/swales.

1.2 DRAINAGE
- Observation: Improper surface drainage.
- Guideline: Standing water shall not remain > 24 hours after rain (48 hours in swales/sump discharge). Standing water beyond 10 feet of foundation is NOT a deficiency.
- Exclusion: Ponding caused by homeowner landscaping/sod placement.

2. FOUNDATION AND CONCRETE
2.1 CAST-IN-PLACE CONCRETE
- Observation: Basement/Foundation wall cracks.
- Guideline: Cracks > 1/4 inch width are deficiencies.
- Observation: Basement floor cracking.
- Guideline: Cracks > 1/4 inch width OR 3/16 inch vertical displacement are deficiencies.
- Observation: Garage floor slab cracking.
- Guideline: Cracks > 3/16 inch width OR 3/16 inch vertical displacement are deficiencies.
- Observation: Garage floor settlement/heave.
- Guideline: Shall not settle/heave > 1 inch from structure.
- Observation: Uneven concrete floors (habitable rooms).
- Guideline: Unevenness > 3/8 inch in 32 inches is a deficiency.
- Observation: Stoops/Steps settling.
- Guideline: Separation > 1 inch from home is a deficiency.

2.2 JOINTS
- Observation: Separation at control joints.
- Guideline: NONE. Concrete is designed to crack at control joints. No coverage.

3. MASONRY
3.1 UNIT MASONRY
- Observation: Cracks in masonry/veneer.
- Guideline: Cracks > 1/4 inch width OR visible from > 20 feet are deficiencies.
3.2 STUCCO
- Observation: Cracking in stucco.
- Guideline: Cracks > 1/8 inch width are deficiencies.

4. CARPENTRY AND FRAMING
4.1 PLYWOOD AND JOISTS
- Observation: Squeaky floors.
- Guideline: Loud/objectionable squeaks caused by loose subfloor are deficiencies. A totally squeak-proof floor cannot be guaranteed.
- Observation: Uneven wood floors.
- Guideline: Ridge or depression > 1/4 inch within 32 inches.
- Observation: Bowed walls.
- Guideline: Bowing > 1/2 inch within 32 inches horizontal or 8 feet vertical.
- Observation: Out of plumb walls.
- Guideline: > 3/8 inch out of plumb in 32 inches vertical.
4.2 FINISH CARPENTRY
- Observation: Interior trim joints.
- Guideline: Open joints > 1/8 inch are deficiencies.
- Observation: Interior trim splits.
- Guideline: Splits > 1/8 inch are deficiencies.
- Observation: Nail heads.
- Guideline: Should not be visible from 6 feet under normal lighting.
- Observation: Exterior trim joints.
- Guideline: Joints > 1/4 inch between trim and siding/masonry are deficiencies.

5. THERMAL AND MOISTURE
5.1 WATERPROOFING
- Observation: Basement leaks.
- Guideline: Actual trickling of water is a deficiency. Dampness is NOT a deficiency.
5.5 EXTERIOR SIDING
- Observation: Siding Delamination/Splitting.
- Guideline: Splits > 1/8 inch wide and > 1 inch long are deficiencies.
- Observation: Bowed Siding.
- Guideline: Bows > 1/2 inch in 32 inches.
- Observation: Loose Trim.
- Guideline: Separation > 1/4 inch.
5.6 ROOFING
- Observation: Leaks.
- Guideline: Roof/flashing should not leak.
- Exclusion: Leaks caused by ice buildup, leaves, debris (homeowner maintenance).
- Observation: Blown off shingles.
- Guideline: Only covered if winds were LESS than manufacturer standards. Gusts > 60mph usually excluded (Acts of God).
5.7 SHEET METAL (GUTTERS)
- Observation: Standing water in gutters.
- Guideline: Water > 1/2 inch depth remaining after rain is a deficiency.

6. DOORS AND WINDOWS
6.1 DOORS
- Observation: Interior/Exterior door warpage.
- Guideline: Warpage > 1/4 inch measured corner to corner.
- Observation: Door gaps (bottom).
- Guideline: Gap > 1.5 inches (Interior passage) or > 2 inches (Closet) is a deficiency.
6.3 WINDOWS
- Observation: Operation.
- Guideline: Should require no greater force than manufacturer specs.
6.6 WEATHER STRIPPING
- Observation: Drafts.
- Guideline: No daylight shall be visible around frame when closed. Some infiltration is normal in high winds.

7. FINISHES
7.2 DRYWALL
- Observation: Drywall cracks.
- Guideline: Cracks > 1/16 inch are deficiencies.
- Repair: One time only during warranty term.
- Observation: Nail pops.
- Guideline: Readily visible from 6 feet under normal lighting.
7.4 VINYL FLOORING
- Observation: Ridges/Depressions.
- Guideline: > 1/8 inch is a deficiency.
- Observation: Seams/Gaps.
- Guideline: Gaps > 1/32 inch (at joints) or > 1/16 inch (at dissimilar materials).
7.5 HARDWOOD FLOORING
- Observation: Gaps.
- Guideline: Gaps > 1/8 inch are deficiencies.
- Observation: Cupping.
- Guideline: Cup > 1/16 inch in 3 inches height.
- Exclusion: Seasonal gapping due to humidity is normal.
7.6 PAINTING
- Observation: Coverage.
- Guideline: Underlying surface shall not show through when viewed from 6 feet.
7.8 CARPET
- Observation: Seams.
- Guideline: Visible gaps or overlapping are deficiencies. Visible seams are NOT deficiencies.

8. SPECIALTIES
8.1 FIREPLACES
- Observation: Chimney Separation.
- Guideline: Separation > 1/2 inch in 10 feet vertical.

9. CABINETS AND COUNTERTOPS
9.1 CABINETS
- Observation: Door Warpage.
- Guideline: Warpage > 1/4 inch.
- Observation: Gaps (Wall/Ceiling).
- Guideline: Gaps > 1/4 inch.
9.2 COUNTERTOPS
- Observation: Cracks (Laminate).
- Guideline: Cracks > 1/16 inch.
- Observation: Cracks (Stone/Granite).
- Guideline: Cracks > 1/32 inch.
- Observation: Chips (Stone).
- Guideline: Chips > 1/32 inch.
- Observation: Lippage (Stone).
- Guideline: Lippage > 1/32 inch.
- Exclusion: Seams are visible and normal.

10. MECHANICAL
10.3 HVAC
- Observation: Cooling.
- Guideline: Must maintain 78°F inside. (If outside > 95°F, must be 15°F cooler than outside).
- Observation: Heating.
- Guideline: Must maintain 70°F inside.

12. MECHANICAL SYSTEMS (PLUMBING)
12.2 PLUMBING
- Observation: Leaks.
- Guideline: Leaks in piping are deficiencies. Condensation is not.
- Observation: Frozen pipes.
- Guideline: Builder responsible if protection inadequate. Homeowner responsible if temperature not maintained in home.

--- SECTION X. EXCLUSIONS (GENERAL) ---
- Damage due to homeowner failure to mitigate.
- Improper maintenance or abuse.
- "Acts of God" (Flood, Earthquake, Wind > 60mph).
- Insects/Vermin/Rodents.
- Dampness/Condensation (unless resulting from a defect).
- Consequential damage (e.g., furniture damaged by a leak).
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
  // 1. Validate Input
  if (!claimTitle && !claimDescription) {
    return {
      status: 'Needs Info',
      reasoning: 'No claim details provided.',
      responseDraft: 'Please provide a title and description for the claim.'
    };
  }

  try {
    // 2. Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
    });

    console.log('🤖 Analyzing claim with AI:', claimTitle);

    // 3. Construct System Prompt
    const systemPrompt = `You are an expert Warranty Officer for a home builder. 
Your job is to review a homeowner claim against the official "2-10 Home Buyers Warranty" guidelines provided below.

Adhere strictly to the "Construction Performance Guidelines" (Section IX).
- If a measurement is provided (e.g., "1/8 inch crack"), compare it mathematically to the standard (e.g., "Standard allows up to 1/4 inch").
- If the claim meets the deficiency standard (is worse than the tolerance), mark as 'Approved'.
- If it does not meet the standard (is within tolerance), mark as 'Denied'.
- If the homeowner did not provide enough detail (e.g., "My floor is uneven" but no measurements), mark as 'Needs Info'.

TONE INSTRUCTIONS:
- Be professional, empathetic, but firm on the standards.
- ALWAYS cite the specific Section Number (e.g., "Per Section 2.1...").
- If Denied, explain exactly why based on the text (e.g., "The guideline states coverage applies only to cracks exceeding 1/4 inch.").

Format your response as a JSON object with these exact fields:
{
  "status": "Approved" | "Denied" | "Needs Info",
  "reasoning": "Brief explanation of why, citing specific guideline",
  "responseDraft": "The full, polite response text for the homeowner"
}

OFFICIAL WARRANTY TEXT:
${WARRANTY_GUIDELINES}`;

    const userPrompt = `CLAIM TO REVIEW:
Title: ${claimTitle}
Description: ${claimDescription}

Please analyze this claim and provide your recommendation in JSON format.`;

    // 4. Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for high factual accuracy
      max_tokens: 1000,
    });

    // 5. Parse Response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from AI');
    }

    const result = JSON.parse(content) as AIReviewResult;

    console.log('✅ AI Analysis complete:', result.status);
    return result;

  } catch (error) {
    console.error('❌ Error analyzing claim with AI:', error);
    
    // Return graceful fallback
    return {
      status: 'Needs Info',
      reasoning: 'AI analysis service temporarily unavailable.',
      responseDraft: 'System error: Unable to perform AI analysis. Please review this claim manually.',
    };
  }
}