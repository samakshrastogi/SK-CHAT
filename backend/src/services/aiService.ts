import { logger } from '../utils/logger.js';
import { CustomError } from '../utils/customError.js';

const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 10000);
const maxAttempts = Math.max(1, Number(process.env.GEMINI_MAX_ATTEMPTS || 2));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(prompt: string, requestSignal?: AbortSignal): Promise<string> {
  if (!geminiApiKey) throw new CustomError('AI service is not configured', 503);

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const abortFromRequest = () => controller.abort();
    requestSignal?.addEventListener('abort', abortFromRequest, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: controller.signal,
        }
      );
      if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}`);
      const data = await response.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini returned an empty response');
      return text.trim();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown Gemini error');
      logger.warn(`Gemini attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`);
      if (requestSignal?.aborted) throw new CustomError('AI request cancelled', 499);
      if (attempt < maxAttempts) await delay(250 * attempt);
    } finally {
      clearTimeout(timeout);
      requestSignal?.removeEventListener('abort', abortFromRequest);
    }
  }
  logger.error(`Gemini request failed: ${lastError?.message}`);
  throw new CustomError('AI service is temporarily unavailable', 503);
}

export const getSmartReplies = async (recentMessages: { sender: string; text: string }[], signal?: AbortSignal): Promise<string[]> => {
  const formatted = recentMessages.map((m) => `${m.sender}: ${m.text}`).join('\n');
  const response = await callGemini(`Generate exactly 3 short contextual replies as a JSON string array only.\n\n${formatted}`, signal);
  try {
    const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) throw new Error('Invalid reply format');
    return parsed.slice(0, 3);
  } catch {
    throw new CustomError('AI service returned an invalid smart-reply response', 502);
  }
};

export const summarizeChat = async (messages: { sender: string; text: string }[], signal?: AbortSignal): Promise<string> => {
  const formatted = messages.map((m) => `${m.sender}: ${m.text}`).join('\n');
  return callGemini(`Summarize this chat in at most four concise bullet points:\n\n${formatted}`, signal);
};
export const translateMessage = (text: string, language: string, signal?: AbortSignal) =>
  callGemini(`Translate into ${language}. Return only the translation:\n\n"${text}"`, signal);
export const rewriteMessage = (text: string, tone: 'professional' | 'casual' | 'friendly' | 'grammar', signal?: AbortSignal) =>
  callGemini(tone === 'grammar'
    ? `Correct grammar and spelling. Return only the corrected message:\n\n"${text}"`
    : `Rewrite in a ${tone} tone. Return only the rewritten message:\n\n"${text}"`, signal);
export const generateAIResponse = (prompt: string, context?: string, signal?: AbortSignal) =>
  callGemini(context ? `Chat context:\n${context}\n\nQuestion: ${prompt}` : prompt, signal);
