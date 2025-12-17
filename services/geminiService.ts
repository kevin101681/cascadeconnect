import { GoogleGenAI } from "@google/genai";
import { Claim } from "../types";

// Lazy initialization - only create AI instance when needed and API key is available
let aiInstance: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI | null => {
  if (aiInstance) return aiInstance;
  
  // Get API key from Vite environment variables
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                 (typeof process !== 'undefined' ? process.env.VITE_GEMINI_API_KEY : undefined);
  
  if (!apiKey) {
    console.warn("⚠️ Gemini API key not found. AI features will use fallback templates.");
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

export const summarizeClaim = async (claim: Claim): Promise<string> => {
  const ai = getAI();
  if (!ai) {
    // Fallback: return first sentence of description
    return claim.description.split('.')[0] + '.';
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize the following warranty claim description into a concise summary (1-2 sentences).
      
      Title: ${claim.title}
      Description: ${claim.description}
      Category: ${claim.category}`,
    });
    return response.text || claim.description;
  } catch (error) {
    console.error("Gemini API Error (summarizeClaim):", error);
    return claim.description;
  }
};

export const draftSchedulingEmail = async (claim: Claim, proposedDates: string[]): Promise<string> => {
  const ai = getAI();
  if (!ai) {
    // Fallback template
    return `Dear ${claim.homeownerName},

Regarding your warranty claim "${claim.title}":

We have proposed the following dates for repair:
${proposedDates.join(', ')}

Please log in to your portal at cascadebuilderservices.com to confirm one of these times.

Sincerely,
Cascade Builder Services`;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Draft a professional scheduling email to the homeowner regarding their warranty claim.
      
      Homeowner Name: ${claim.homeownerName}
      Claim Title: ${claim.title}
      Proposed Dates: ${proposedDates.join(', ')}
      
      Instructions:
      - Be polite and professional.
      - Mention the proposed dates.
      - Ask them to log in to their portal at cascadebuilderservices.com to confirm.
      - Sign it "Sincerely, Cascade Builder Services".`,
    });
    return response.text || `Dear ${claim.homeownerName},\n\nPlease log in to confirm scheduling for claim: ${claim.title}.`;
  } catch (error) {
    console.error("Gemini API Error (draftSchedulingEmail):", error);
    // Fallback template
    return `Dear ${claim.homeownerName},

Regarding your warranty claim "${claim.title}":

We have proposed the following dates for repair:
${proposedDates.join(', ')}

Please log in to your portal at cascadebuilderservices.com to confirm one of these times.

Sincerely,
Cascade Builder Services`;
  }
};

export const draftInviteEmail = async (homeownerName: string): Promise<string> => {
  // Use the new template without AI
  return `Dear ${homeownerName},

On behalf of Cascade Builder Services, we extend our warmest congratulations on your new home! We hope you settle in beautifully and enjoying every moment in your wonderful new space.

We're writing to you today because Cascade Builder Services proudly partners with your builder to provide dedicated warranty support for your home. Our goal is to ensure your peace of mind and the long-term enjoyment of your investment.

As part of this partnership, we facilitate important warranty evaluations, including your 60-day and 11-month assessments. These scheduled evaluations are designed to proactively address any potential concerns and ensure everything in your home continues to meet the highest standards.

To help us serve you best and to give you easy access to your warranty information, service requests, and important documents, we kindly ask you to activate your online account. It's a quick and simple process!

Please visit **cascadebuilderservices.com** and use the activation link below to get started:

<div style="margin: 20px 0; text-align: center;">
  <a href="https://cascadebuilderservices.com/register?account_id=new" style="display: inline-block; background-color: #6750A4; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 24px; font-weight: 500; font-size: 14px; text-align: center; font-family: Arial, sans-serif; border: none; cursor: pointer;">Activate Your Account</a>
</div>

Should you have any questions as you get settled, or require assistance with your account activation, please don't hesitate to reach out to us. We're here to help!

Warmly,

The Team at Cascade Builder Services
info@cascadebuilderservices.com
cascadebuilderservices.com`;
};