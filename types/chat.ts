export type ChatSender = 'user' | 'ai';

export type ChatMessage = {
  id: string;
  sender: ChatSender;
  message: string;
  timestamp: string;
  quotedClause?: string;
  followUpSuggestions?: string[];
  sources?: string[];
  disclaimer?: string;
};

export type ChatApiResponse = {
  reply: string;
  sources?: string[];
  disclaimer?: string;
  followUpSuggestions?: string[];
};

export type ChatHistoryItem = {
  sender: ChatSender;
  message: string;
};
