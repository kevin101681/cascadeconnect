export interface MaintenanceAIResponse {
  answer: string;
  action: 'CLAIM' | 'MESSAGE' | 'INFO' | 'HELP_TAB';
  // Smart Pre-fill fields (optional)
  suggestedTitle?: string;
  suggestedDescription?: string;
  suggestedSubject?: string;
  suggestedMessage?: string;
}

export const askMaintenanceAI = async (question: string): Promise<MaintenanceAIResponse> => {
  if (!question || question.trim().length === 0) {
    return {
      answer: "Please enter a question about home maintenance.",
      action: 'INFO'
    };
  }

  const response = await fetch("/.netlify/functions/ai-maintenance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: question }),
  });

  if (!response.ok) {
    throw new Error("AI request failed");
  }

  return (await response.json()) as MaintenanceAIResponse;
};
