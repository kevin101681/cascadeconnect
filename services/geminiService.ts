import { GoogleGenAI } from "@google/genai";
import { Claim } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeClaim = async (claim: Claim): Promise<string> => {
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
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Draft a warm welcome email to new homeowner ${homeownerName} from Cascade Builder Services.
      
      Instructions:
      - Welcome them to their new home.
      - Explain we partner with their builder for warranty support (60-day and 11-month evaluations).
      - Ask them to activate their online account at cascadebuilderservices.com.
      - Include a placeholder for the activation link.
      - Contact: info@cascadebuilderservices.com.`,
    });
    return response.text || `Dear ${homeownerName}, Welcome home!`;
  } catch (error) {
    console.error("Gemini API Error (draftInviteEmail):", error);
    // Fallback template
    return `Dear Homeowner,

Welcome home! Congratulations on your purchase.
Your builder has partnered with Cascade Builder Services to ensure you receive exceptional support during your one-year warranty term.

We’ve set up an online customer service portal for you at cascadebuilderservices.com.

Action Required: Please click the link below to activate your account.

[ ACCEPT ]
https://cascadebuilderservices.com/register?account_id=new

Sincerely,
Cascade Builder Services`;
  }
};