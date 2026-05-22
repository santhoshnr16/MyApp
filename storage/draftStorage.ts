import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DraftRecord } from '@/types/draft';

const PREFIX = 'draft:';
const INDEX_KEY = 'draft:index';

async function getIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function setIndex(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

export async function saveDraft(draft: DraftRecord): Promise<void> {
  await AsyncStorage.setItem(PREFIX + draft.draftId, JSON.stringify(draft));
  const index = await getIndex();
  if (!index.includes(draft.draftId)) {
    await setIndex([draft.draftId, ...index]);
  }
}

export async function loadDraft(draftId: string): Promise<DraftRecord | null> {
  const raw = await AsyncStorage.getItem(PREFIX + draftId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DraftRecord;
  } catch {
    return null;
  }
}

export async function listDrafts(): Promise<DraftRecord[]> {
  const index = await getIndex();
  const drafts = await Promise.all(index.map(loadDraft));
  return drafts.filter((d): d is DraftRecord => d !== null);
}

export async function deleteDraft(draftId: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + draftId);
  const index = await getIndex();
  await setIndex(index.filter((id) => id !== draftId));
}
