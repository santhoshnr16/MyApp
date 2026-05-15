import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import type { DocumentFile } from '@/types/document';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export type FilePickResult =
  | { file: DocumentFile; error?: never; cancelled?: never }
  | { file?: never; error: string; cancelled?: never }
  | { file?: never; error?: never; cancelled: true };

export async function pickPdfFile(): Promise<FilePickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return { cancelled: true };
  }

  const asset = result.assets?.[0];
  if (!asset) {
    return { error: 'Unable to read the selected file.' };
  }

  const mimeType = asset.mimeType ?? 'application/pdf';
  const name = asset.name ?? 'document.pdf';
  const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
  const size =
    info.exists && 'size' in info && typeof info.size === 'number'
      ? info.size
      : asset.size ?? 0;

  if (!name.toLowerCase().endsWith('.pdf') && !mimeType.includes('pdf')) {
    return { error: 'Please upload a PDF file only.' };
  }

  if (size > MAX_SIZE_BYTES) {
    return { error: 'File is too large. Max 10MB.' };
  }

  return {
    file: {
      uri: asset.uri,
      name,
      size,
      mimeType,
    },
  };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
