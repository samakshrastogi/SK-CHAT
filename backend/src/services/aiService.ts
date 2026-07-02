import { logger } from '../utils/logger.js';

const geminiApiKey = process.env.GEMINI_API_KEY;
let isGeminiConfigured = false;

if (geminiApiKey) {
  isGeminiConfigured = true;
  logger.info('Gemini API configured successfully');
} else {
  logger.warn('GEMINI_API_KEY missing. AI Assistant will run in simulated fallback mode');
}

/**
 * Call Gemini API using standard HTTP post for simplicity and node compatibility without extra heavy packages.
 */
async function callGemini(prompt: string): Promise<string> {
  try {
    if (!isGeminiConfigured) {
      throw new Error('Gemini not configured');
    }
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }
    return text.trim();
  } catch (error: any) {
    logger.error(`Gemini API call failed: ${error.message}. Falling back to simulation.`);
    return mockGeminiResponse(prompt);
  }
}

/**
 * Fallback generator to simulate responses for chats, translations, and summaries.
 */
function mockGeminiResponse(prompt: string): string {
  const lowercase = prompt.toLowerCase();
  
  if (lowercase.includes('summarize')) {
    return 'Summary: The participants discussed setting up the new database models, integrating socket.io, and starting work on the React frontend. They resolved to support a local fallback for file uploads and mail services to facilitate easy development setup.';
  }
  
  if (lowercase.includes('translate')) {
    if (lowercase.includes('spanish')) {
      return '¡Hola! ¿Cómo estás hoy? Espero que todo vaya bien con el desarrollo del proyecto.';
    }
    if (lowercase.includes('french')) {
      return 'Bonjour! Comment allez-vous aujourd’hui? J’espère que tout se passe bien avec le développement.';
    }
    return 'Hello! How are you doing today? (Simulated Translation)';
  }
  
  if (lowercase.includes('smart reply') || lowercase.includes('suggest replies')) {
    return JSON.stringify([
      'Sounds great, let’s do it!',
      'Can you tell me more about that?',
      'I will look into this right away.'
    ]);
  }
  
  if (lowercase.includes('grammar') || lowercase.includes('correct')) {
    return 'Here is the corrected sentence: "Hey, are you free for a call now?"';
  }

  if (lowercase.includes('rewrite') || lowercase.includes('professional') || lowercase.includes('tone')) {
    return 'I would like to inquire if you are available to join a conference call at this time.';
  }

  return 'Hello! I am your Connect AI assistant. How can I help you manage your conversations, fix grammar, or summarize chats today?';
}

export const getSmartReplies = async (recentMessages: { sender: string; text: string }[]): Promise<string[]> => {
  if (isGeminiConfigured) {
    const formatted = recentMessages.map((m) => `${m.sender}: ${m.text}`).join('\n');
    const prompt = `Analyze the following recent chat conversation and generate 3 appropriate short, contextual quick reply options (smart replies) as a JSON string array of strings. Do not include markdown code block syntax. Just return the JSON array, like ["option1", "option2", "option3"].\n\n${formatted}`;
    try {
      const responseText = await callGemini(prompt);
      // Clean up markdown block quotes if present
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      logger.error('Failed to parse smart replies response. Using mock.');
    }
  }
  
  return JSON.parse(mockGeminiResponse('suggest replies'));
};

export const summarizeChat = async (messages: { sender: string; text: string }[]): Promise<string> => {
  const formatted = messages.map((m) => `${m.sender}: ${m.text}`).join('\n');
  const prompt = `Read the following chat history and provide a concise, readable bullet-pointed summary (maximum 3-4 bullet points) of the main topics discussed, agreements, or action items:\n\n${formatted}`;
  return callGemini(prompt);
};

export const translateMessage = async (text: string, targetLanguage: string): Promise<string> => {
  const prompt = `Translate the following message into ${targetLanguage}. Return ONLY the translated text, do not add explanation, intro, or quotation marks:\n\n"${text}"`;
  return callGemini(prompt);
};

export const rewriteMessage = async (text: string, tone: 'professional' | 'casual' | 'friendly' | 'grammar'): Promise<string> => {
  const prompt = tone === 'grammar' 
    ? `Fix the grammar and spelling errors in this message while keeping its original meaning. Return ONLY the corrected message, no explanations:\n\n"${text}"`
    : `Rewrite the following message in a ${tone} tone. Keep the message length relatively similar and return ONLY the rewritten message:\n\n"${text}"`;
  return callGemini(prompt);
};

export const generateAIResponse = async (userPrompt: string, context?: string): Promise<string> => {
  const prompt = context
    ? `You are ConnectAI, an intelligent chat assistant built into the Connect messenger. Context from the active chat: \n${context}\n\nUser Question: ${userPrompt}\n\nAnswer helpfully and concisely.`
    : `You are ConnectAI, an intelligent chat assistant built into the Connect messenger. Answer the user prompt helpfully and concisely: ${userPrompt}`;
  return callGemini(prompt);
};
