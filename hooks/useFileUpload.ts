import { useState } from 'react';

import { pickPdfFile } from '@/services/documentProcessor';
import type { DocumentFile } from '@/types/document';

export function useFileUpload() {
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const pickFile = async () => {
    setIsPicking(true);
    setError(null);
    try {
      const result = await pickPdfFile();
      if ('cancelled' in result) {
        return null;
      }
      if ('error' in result) {
        setError(result.error);
        return null;
      }
      setFile(result.file);
      return result.file;
    } finally {
      setIsPicking(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return {
    file,
    error,
    isPicking,
    pickFile,
    removeFile,
    setError,
  };
}
