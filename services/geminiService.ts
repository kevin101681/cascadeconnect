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
      model: 'gemini-3.0-flash',
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
      model: 'gemini-3.0-flash',
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

/**
 * Detects if a message contains warranty claim intent.
 * @param message - The message content to analyze
 * @returns true if the message is likely a warranty claim, false otherwise
 */
export const detectClaimIntent = async (message: string): Promise<boolean> => {
  const ai = getAI();
  if (!ai) {
    // Fail open - if AI is not available, return false so user can still send message
    return false;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: `Analyze the following homeowner message and determine if they are describing a physical defect, repair request, or home issue that should be tracked as a "Warranty Claim" (vs. a general question or administrative message).

Message: "${message}"

Instructions:
- Return ONLY "YES" if this message describes:
  * A physical defect or damage (e.g., cracked tile, leaking pipe, broken fixture)
  * A repair request or maintenance issue
  * A home system malfunction (HVAC, plumbing, electrical, etc.)
  * Something that needs to be fixed or inspected
- Return ONLY "NO" if this is:
  * A general question or inquiry
  * An administrative message
  * A scheduling question
  * A thank you or acknowledgment
  * A request for information

Respond with ONLY the word "YES" or "NO" (no explanation).`,
    });
    
    const result = response.text?.trim().toUpperCase();
    return result === 'YES';
  } catch (error) {
    console.error("Gemini API Error (detectClaimIntent):", error);
    // Fail open - if the API fails, return false so user can still send their message
    return false;
  }
};

/**
 * Aggressive Call Intent Detection for AI Gatekeeper
 * 
 * Analyzes incoming caller information to detect spam/sales calls.
 * This is designed to be STRICT - when in doubt, classify as SPAM.
 * 
 * @param callerInfo - Information about the caller
 * @returns "SPAM" if likely spam/sales, "LEGIT" if legitimate caller
 */
export interface CallerInfo {
  callerName?: string;
  callerPurpose?: string;
  callerCompany?: string;
  callTranscript?: string;
}

export type CallIntentResult = 'SPAM' | 'LEGIT';

export const detectCallIntent = async (callerInfo: CallerInfo): Promise<CallIntentResult> => {
  const ai = getAI();
  if (!ai) {
    // Fail secure - if AI is not available, assume SPAM for safety
    console.warn("⚠️ Gemini AI unavailable - defaulting to SPAM classification");
    return 'SPAM';
  }
  
  try {
    // Build context from available caller information
    const context = [
      callerInfo.callerName ? `Caller Name: ${callerInfo.callerName}` : null,
      callerInfo.callerCompany ? `Company: ${callerInfo.callerCompany}` : null,
      callerInfo.callerPurpose ? `Stated Purpose: ${callerInfo.callerPurpose}` : null,
      callerInfo.callTranscript ? `Transcript: ${callerInfo.callTranscript}` : null,
    ].filter(Boolean).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: `You are a cynical security guard protecting someone from spam calls. Your job is to be STRICT and suspicious.

CALLER INFORMATION:
${context}

CLASSIFICATION RULES:

Classify as SPAM if ANY of these red flags are present:
- Selling anything (solar panels, insurance, extended warranties, home services, credit cards, loans, etc.)
- Asking for "the business owner" or "the homeowner" generically
- Vague or evasive about their purpose
- Using high-pressure language ("limited time offer", "act now", etc.)
- Asking to "verify" or "update" information
- Political campaigns or fundraising
- Surveys or market research
- "This is not a sales call" (paradoxically, these usually are)
- Robocalls or automated messages
- Unknown company name or suspicious company (e.g., "Energy Solutions", "Home Services", etc.)
- Any mention of: Medicare, social security, student loans, debt relief, auto warranty, etc.

Classify as LEGIT ONLY if:
- They provide a SPECIFIC, VERIFIABLE reason for calling (e.g., "Delivery for Kevin at 123 Main St", "Dr. Smith's office calling about your appointment on Tuesday")
- They mention a specific person, address, or appointment time
- They're from a known service provider with a specific issue (e.g., "Your internet is down, we're fixing it")
- They're a personal contact (friend, family, colleague) - but they must be specific

WHEN IN DOUBT, CLASSIFY AS SPAM.

Respond with ONLY the word "SPAM" or "LEGIT" (no explanation).`,
    });
    
    const result = response.text?.trim().toUpperCase();
    
    // Default to SPAM if response is unclear
    if (result === 'LEGIT') {
      console.log('✅ Call classified as LEGIT:', callerInfo);
      return 'LEGIT';
    } else {
      console.log('🚫 Call classified as SPAM:', callerInfo);
      return 'SPAM';
    }
  } catch (error) {
    console.error("Gemini API Error (detectCallIntent):", error);
    // Fail secure - if the API fails, default to SPAM for safety
    return 'SPAM';
  }
};