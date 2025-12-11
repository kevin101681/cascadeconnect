import { Claim } from "../types";

// AI features disabled. Returning static content or pass-through data.

export const summarizeClaim = async (claim: Claim): Promise<string> => {
  // Since AI summary is disabled, return the full description or a truncated version.
  return claim.description;
};

export const draftSchedulingEmail = async (claim: Claim, proposedDates: string[]): Promise<string> => {
  // Return a static template instead of AI generation
  return `Dear ${claim.homeownerName},

Regarding your warranty claim "${claim.title}":

We have proposed the following dates for repair:
${proposedDates.join(', ')}

Please log in to your portal at cascadebuilderservices.com to confirm one of these times.

Sincerely,
Cascade Builder Services`;
};

export const draftInviteEmail = async (homeownerName: string): Promise<string> => {
  // Static template
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