import { useCallback, useRef } from 'react';

import { useDocumentContext } from '@/context/document-context';
import { uploadAndAnalyze } from '@/services/legalAI';
import type { AnalysisOptions, DocumentFile } from '@/types/document';

export function useDocumentAnalysis() {
  const { dispatch } = useDocumentContext();
  const abortRef = useRef<AbortController | null>(null);

  const analyzeDocument = useCallback(
    async (file: DocumentFile, options: AnalysisOptions) => {
      dispatch({ type: 'SET_LOADING', payload: { uploading: true, analyzing: true } });
      dispatch({ type: 'CLEAR_ERROR', payload: 'upload' });

      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await uploadAndAnalyze(file, options, controller.signal);

        const documentRecord = {
          documentId: response.documentId,
          filename: file.name,
          language: options.language,
          uploadedAt: new Date().toISOString(),
          analysis: {
            summary: response.summary,
            keyPoints: response.keyPoints,
            risks: response.risks,
            obligations: response.obligations,
            riskScore: response.riskScore,
            documentType: response.documentType,
          },
        };

        dispatch({ type: 'UPSERT_DOCUMENT', payload: documentRecord });
        dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: response.documentId });

        return response.documentId;
      } catch (error) {
        const isCancelled = (error as { name?: string }).name === 'CanceledError';
        if (isCancelled) {
          dispatch({
            type: 'SET_ERROR',
            payload: { upload: 'Analysis cancelled. You can try again.' },
          });
          return null;
        }
        dispatch({
          type: 'SET_ERROR',
          payload: { upload: 'Analysis failed. Please try again.' },
        });
        return null;
      } finally {
        abortRef.current = null;
        dispatch({ type: 'SET_LOADING', payload: { uploading: false, analyzing: false } });
      }
    },
    [dispatch]
  );

  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'SET_LOADING', payload: { uploading: false, analyzing: false } });
  }, [dispatch]);

  return { analyzeDocument, cancelAnalysis };
}
