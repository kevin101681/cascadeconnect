
import { GoogleGenAI } from "@google/genai";
import { Expense, Invoice } from "../types";

// Helper to safely get API Key in Vite environment
const getApiKey = () => {
  // Check for standard Vite Env Var first, then fallback to process.env safely
  const envKey = (import.meta as any).env?.VITE_GOOGLE_API_KEY || (process as any).env?.API_KEY;
  return envKey || null;
};

export const generateFinancialAnalysis = async (
  invoices: Invoice[],
  expenses: Expense[]
): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "AI Configuration Missing: Please set VITE_GOOGLE_API_KEY in your Netlify Environment Variables.";
  }

  try {
    // Initialize lazily inside the function
    const ai = new GoogleGenAI({ apiKey });
    
    const incomeTotal = invoices.reduce((acc, inv) => acc + inv.total, 0);
    const expenseTotal = expenses.reduce((acc, exp) => acc + exp.amount, 0);
    const profit = incomeTotal - expenseTotal;

    // Summarize data to avoid token limits
    const expenseCategories = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const prompt = `
      You are a financial advisor for a small business.
      Analyze the following financial snapshot:
      
      Total Income: $${incomeTotal.toFixed(0)}
      Total Expenses: $${expenseTotal.toFixed(0)}
      Net Profit: $${profit.toFixed(0)}
      
      Expense Breakdown by Category:
      ${JSON.stringify(expenseCategories, null, 2)}
      
      Recent Invoices count: ${invoices.length}
      Recent Expenses count: ${expenses.length}

      Please provide a brief, actionable executive summary (max 3 paragraphs).
      Highlight the profit margin, largest expense categories, and suggest 1 potential area for cost optimization or revenue growth.
      Use a professional yet encouraging tone.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate AI analysis at this time. Please try again later.";
  }
};

export interface CheckAnalysisResult {
  payorName: string;
  checkNumber: string;
  amount: number;
}

export const analyzeCheckImage = async (base64Image: string): Promise<CheckAnalysisResult | null> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Extract MIME type
    const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    // Clean base64 string
    const data = base64Image.replace(/^data:[^;]+;base64,/, "");

    const prompt = `
      Analyze this image of a bank check.
      Extract the following details:
      1. Payor Name (The company or person name in the top left).
      2. Check Number (Top right or bottom MICR line).
      3. Amount (Numeric value).
      
      Return JSON ONLY:
      {
        "payorName": "string",
        "checkNumber": "string",
        "amount": number
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as CheckAnalysisResult;
  } catch (error) {
    console.error("Check Scan Error:", error);
    return null;
  }
};

export const parseInvoiceFromText = async (text: string, customRules?: string): Promise<Partial<Invoice> | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      You are an AI assistant that extracts invoice data from unstructured text (like emails).
      
      ${customRules ? `IMPORTANT USER RULES TO FOLLOW:\n${customRules}\n` : ''}

      Extract the following fields into a JSON object:
      - clientName: The name of the company or person being billed.
      - date: The invoice date in YYYY-MM-DD format. If not found, use today.
      - dueDate: The due date in YYYY-MM-DD format.
      - projectDetails: The address or location of the work.
      - items: An array of line items. Each item must have:
        - description: string
        - quantity: number (default to 1 if not clear)
        - rate: number (price per unit)
        - amount: number (quantity * rate)
      
      If you can't find specific fields, make a reasonable guess based on the context.
      
      Text to parse:
      "${text}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    if (response.text) {
        return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("AI Parse Error:", error);
    return null;
  }
};

export const parseInvoiceFromImage = async (base64Image: string, customRules?: string): Promise<Partial<Invoice> | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
      console.error("API Key Missing");
      return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Extract MIME type from the base64 string (supports image/png, image/jpeg, application/pdf, etc.)
    const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    // Clean base64 data by removing the header
    const data = base64Image.replace(/^data:[^;]+;base64,/, "");

    const prompt = `
      You are an AI assistant that extracts invoice data from an image (e.g. a photo of a document or email on a screen).
      
      ${customRules ? `IMPORTANT USER RULES TO FOLLOW:\n${customRules}\n` : ''}

      Extract the following fields into a JSON object:
      - clientName: The name of the company or person being billed.
      - date: The invoice date in YYYY-MM-DD format. If not found, use today.
      - dueDate: The due date in YYYY-MM-DD format.
      - projectDetails: The address or location of the work.
      - items: An array of line items. Each item must have:
        - description: string
        - quantity: number (default to 1 if not clear)
        - rate: number (price per unit)
        - amount: number (quantity * rate)
      
      Return JSON ONLY.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: {
        parts: [
            { inlineData: { mimeType: mimeType, data: data } },
            { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    if (response.text) {
        return JSON.parse(response.text);
    }
    console.error("No text response from Gemini");
    return null;
  } catch (error) {
    console.error("AI Image Parse Error:", error);
    return null;
  }
};
