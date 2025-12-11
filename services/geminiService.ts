import { GoogleGenAI, Type } from "@google/genai";
import { Claim } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

export const summarizeClaim = async (claim: Claim): Promise<string> => {
  try {
    const prompt = `
      You are an expert warranty manager assistant. Summarize the following warranty claim into a concise, professional technical summary suitable for a contractor Service Order.
      
      Claim Title: ${claim.title}
      Description: ${claim.description}
      Category: ${claim.category}
      
      Keep it under 30 words. Focus on the defect and location.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "Summary unavailable.";
  } catch (error) {
    console.error("Error summarizing claim:", error);
    return "Error generating summary.";
  }
};

export const draftSchedulingEmail = async (claim: Claim, proposedDates: string[]): Promise<string> => {
  try {
    const prompt = `
      Draft a professional email to the homeowner, ${claim.homeownerName}, regarding their warranty claim "${claim.title}".
      
      We have scheduled/proposed the following dates for repair:
      ${proposedDates.join(', ')}
      
      Ask them to login to the portal to confirm one of these times. 
      Keep the tone helpful and empathetic but professional. 
      Output ONLY the email body text.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "Draft unavailable.";
  } catch (error) {
    console.error("Error drafting email:", error);
    return "Error generating draft.";
  }
};

export const draftInviteEmail = async (homeownerName: string): Promise<string> => {
  // Use specific template as requested
  return `Dear Homeowner,

Welcome home! Congratulations on your purchase.
Your builder has partnered with Cascade Builder Services to ensure you receive exceptional support during your one-year warranty term. Our goal is to make managing your warranty requests as easy and efficient as possible.

We manage the entire process—from evaluating requests to assisting with scheduling approved repairs. We conduct formal evaluations at 60 days and 11 months following your closing date; you can find more information in your Homeowner Manual.

We’ve set up an online customer service portal for you at cascadebuilderservices.com. This is where you will submit all requests and access important documents.

Action Required: Before we can process your requests, you need to activate your online account. Please click the "Accept" button below to begin.

Have a question? Reach out to us anytime at info@cascadebuilderservices.com or 888-429-5468.

We look forward to serving you!

[ ACCEPT ]
https://cascadebuilderservices.com/register?account_id=new`;
};