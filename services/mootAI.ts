import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildMootSystemPrompt } from '@/constants/mootPrompt';
import type { MootMessage, MootRole, OllamaMessage, VerdictData } from '@/types/moot';

const OLLAMA_BASE = process.env.EXPO_PUBLIC_OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = 'llama3.2:3b-instruct-q4_K_M';
const VERDICT_KEY = (documentId: string) => `moot:verdict:${documentId}`;

export type MootAIResponse =
  | { isVerdict: false; text: string }
  | { isVerdict: true; text: string; verdict: VerdictData };

export async function sendMootArgument(params: {
  documentId: string;
  documentSummary: string;
  documentType: string;
  jurisdiction: string;
  studentRole: MootRole;
  opposingRole: MootRole;
  exchangeNumber: number;
  sessionMessages: MootMessage[];
  studentArgument: string;
}): Promise<MootAIResponse> {
  const {
    documentSummary,
    documentType,
    jurisdiction,
    studentRole,
    opposingRole,
    exchangeNumber,
    sessionMessages,
    studentArgument,
  } = params;

  const systemPrompt = buildMootSystemPrompt({
    documentSummary,
    documentType,
    jurisdiction,
    studentRole,
    opposingRole,
    exchangeNumber,
  });

  const history: OllamaMessage[] = sessionMessages.map((msg) => ({
    role: msg.sender === 'student' ? 'user' : 'assistant',
    content: msg.text,
  }));

  const messages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: studentArgument },
  ];

  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 300,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  const content = (data.message?.content ?? '').trim();

  const jsonMatch = content.match(/\{[\s\S]*"isVerdict"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const verdict = JSON.parse(jsonMatch[0]) as VerdictData;
      if (verdict.isVerdict === true) {
        return { isVerdict: true, text: content, verdict };
      }
    } catch {
      // not valid JSON verdict - fall through
    }
  }

  return { isVerdict: false, text: content };
}

export async function saveVerdict(documentId: string, verdict: VerdictData): Promise<void> {
  await AsyncStorage.setItem(VERDICT_KEY(documentId), JSON.stringify(verdict));
}

export async function loadVerdict(documentId: string): Promise<VerdictData | null> {
  const raw = await AsyncStorage.getItem(VERDICT_KEY(documentId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VerdictData;
  } catch {
    return null;
  }
}

export async function clearVerdict(documentId: string): Promise<void> {
  await AsyncStorage.removeItem(VERDICT_KEY(documentId));
}
