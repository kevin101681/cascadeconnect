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
  try {
    const prompt = `
      Draft a warm and professional email inviting a new homeowner, ${homeownerName}, to the Cascade Connect Warranty Portal.
      
      Key points:
      - Welcome them to their new home.
      - Explain that Cascade Connect is the official platform to submit and track warranty claims.
      - Mention features: direct contractor communication, real-time updates, and scheduling.
      - Provide a placeholder link [Link] for registration.
      
      Output ONLY the email body text.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "Draft unavailable.";
  } catch (error) {
    console.error("Error drafting invite:", error);
    return "Error generating invite draft.";
  }
};