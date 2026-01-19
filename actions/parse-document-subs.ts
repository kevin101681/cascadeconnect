/**
 * DOCUMENT PARSING SERVER ACTION - AI-POWERED
 * 
 * Features:
 * - Parses PDF and Word documents using Gemini AI
 * - Extracts subcontractor information (Company Name, Contact Name, Email, Phone)
 * - Returns structured data matching SubcontractorImportRow interface
 * - Server-side only (for security and API key protection)
 */

'use server';

import { GoogleGenAI } from "@google/genai";

export interface ParsedSubcontractor {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
}

export interface ParseDocumentResult {
  success: boolean;
  data?: ParsedSubcontractor[];
  error?: string;
}

/**
 * Initialize Gemini AI with API key from environment
 */
const getAI = (): GoogleGenAI | null => {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("⚠️ Gemini API key not found in environment variables.");
    return null;
  }
  
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize Gemini AI:", error);
    return null;
  }
};

/**
 * Extract text from PDF using pdfjs-dist
 */
async function extractPDFText(buffer: Buffer): Promise<string> {
  try {
    // Dynamically import pdfjs-dist (server-side compatible)
    const pdfjsLib = await import('pdfjs-dist');
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert file buffer to Base64 (for direct Gemini processing)
 */
function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Parse document (PDF or Word) and extract subcontractor list using Gemini AI
 */
export async function parseDocumentSubs(formData: FormData): Promise<ParseDocumentResult> {
  try {
    const file = formData.get('file') as File;
    
    if (!file) {
      return {
        success: false,
        error: 'No file provided'
      };
    }
    
    // Validate file type
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf');
    const isWord = fileName.endsWith('.doc') || fileName.endsWith('.docx');
    
    if (!isPDF && !isWord) {
      return {
        success: false,
        error: 'Invalid file type. Please upload a PDF or Word document.'
      };
    }
    
    // Initialize Gemini AI
    const ai = getAI();
    if (!ai) {
      return {
        success: false,
        error: 'AI service is not available. Please check server configuration.'
      };
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text from document
    let documentText: string;
    
    if (isPDF) {
      console.log('📄 Extracting text from PDF...');
      documentText = await extractPDFText(buffer);
    } else {
      // For Word documents, use text extraction or pass as base64
      // Note: For now, we'll pass the raw buffer to Gemini and let it handle parsing
      console.log('📝 Processing Word document...');
      documentText = buffer.toString('utf-8');
    }
    
    if (!documentText || documentText.trim().length === 0) {
      return {
        success: false,
        error: 'Document appears to be empty or unreadable.'
      };
    }
    
    console.log(`📊 Document text extracted: ${documentText.length} characters`);
    
    // Prompt Gemini to extract subcontractor information
    const prompt = `You are a document parser. Extract ALL subcontractors from the following document text.

DOCUMENT TEXT:
${documentText}

INSTRUCTIONS:
1. Find all subcontractor/contractor/company entries in the document
2. Extract the following fields for each:
   - Company Name (REQUIRED)
   - Contact Name (optional)
   - Email (optional)
   - Phone Number (optional)
3. Return ONLY a valid JSON array with this exact structure:
[
  {
    "companyName": "Company Name",
    "contactName": "Contact Person",
    "email": "email@example.com",
    "phone": "123-456-7890"
  }
]

RULES:
- If a field is not found, omit it or use empty string
- Ensure company name is always present
- Clean up phone numbers to standard format
- Return ONLY the JSON array, no additional text
- If no subcontractors found, return empty array: []`;

    console.log('🤖 Sending request to Gemini AI...');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
    });
    
    const responseText = response.text?.trim();
    
    if (!responseText) {
      return {
        success: false,
        error: 'AI returned empty response. Document may not contain subcontractor information.'
      };
    }
    
    console.log('✅ AI response received:', responseText.substring(0, 200));
    
    // Parse JSON response
    let parsedData: ParsedSubcontractor[];
    
    try {
      // Remove markdown code blocks if present
      let jsonText = responseText;
      if (jsonText.includes('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }
      
      parsedData = JSON.parse(jsonText.trim());
      
      // Validate structure
      if (!Array.isArray(parsedData)) {
        throw new Error('Response is not an array');
      }
      
      // Filter out entries without company name
      parsedData = parsedData.filter(item => item.companyName && item.companyName.trim().length > 0);
      
      if (parsedData.length === 0) {
        return {
          success: false,
          error: 'No subcontractors found in document. Please verify the document contains a contractor list.'
        };
      }
      
      console.log(`✅ Successfully parsed ${parsedData.length} subcontractors`);
      
      return {
        success: true,
        data: parsedData
      };
      
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      console.error('Raw response:', responseText);
      
      return {
        success: false,
        error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`
      };
    }
    
  } catch (error) {
    console.error('❌ Error parsing document:', error);
    
    return {
      success: false,
      error: `Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
