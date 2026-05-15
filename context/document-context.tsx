import React, { createContext, useContext, useMemo, useReducer } from 'react';

import type { ChatMessage } from '@/types/chat';
import type { DocumentRecord } from '@/types/document';

type LoadingState = {
  uploading: boolean;
  analyzing: boolean;
  chatting: boolean;
};

type ErrorState = {
  upload?: string | null;
  summary?: string | null;
  chat?: string | null;
};

type DocumentState = {
  currentDocumentId?: string;
  documents: Record<string, DocumentRecord>;
  chatByDocument: Record<string, ChatMessage[]>;
  loading: LoadingState;
  errors: ErrorState;
};

type DocumentAction =
  | { type: 'SET_CURRENT_DOCUMENT'; payload: string }
  | { type: 'UPSERT_DOCUMENT'; payload: DocumentRecord }
  | { type: 'SET_DOCUMENT_ANALYSIS'; payload: { documentId: string; analysis: DocumentRecord['analysis'] } }
  | { type: 'SET_CHAT_HISTORY'; payload: { documentId: string; messages: ChatMessage[] } }
  | { type: 'ADD_CHAT_MESSAGE'; payload: { documentId: string; message: ChatMessage } }
  | { type: 'SET_LOADING'; payload: Partial<LoadingState> }
  | { type: 'SET_ERROR'; payload: Partial<ErrorState> }
  | { type: 'CLEAR_ERROR'; payload: keyof ErrorState };

const initialState: DocumentState = {
  documents: {},
  chatByDocument: {},
  loading: {
    uploading: false,
    analyzing: false,
    chatting: false,
  },
  errors: {},
};

const DocumentContext = createContext<{
  state: DocumentState;
  dispatch: React.Dispatch<DocumentAction>;
} | null>(null);

function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case 'SET_CURRENT_DOCUMENT':
      return { ...state, currentDocumentId: action.payload };
    case 'UPSERT_DOCUMENT':
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.payload.documentId]: action.payload,
        },
      };
    case 'SET_DOCUMENT_ANALYSIS': {
      const existing = state.documents[action.payload.documentId];
      if (!existing) {
        return state;
      }
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.payload.documentId]: {
            ...existing,
            analysis: action.payload.analysis,
          },
        },
      };
    }
    case 'SET_CHAT_HISTORY':
      return {
        ...state,
        chatByDocument: {
          ...state.chatByDocument,
          [action.payload.documentId]: action.payload.messages,
        },
      };
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatByDocument: {
          ...state.chatByDocument,
          [action.payload.documentId]: [
            ...(state.chatByDocument[action.payload.documentId] ?? []),
            action.payload.message,
          ],
        },
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          ...action.payload,
        },
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          ...action.payload,
        },
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload]: null,
        },
      };
    default:
      return state;
  }
}

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(documentReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}

export function useDocumentContext() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocumentContext must be used within DocumentProvider');
  }
  return context;
}
