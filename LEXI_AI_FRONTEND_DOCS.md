# LexAI — Front-End Documentation

> **AI-Powered Legal Document Analysis & Chat Assistant**
> Built with React Native (Expo SDK 54) + TypeScript

---

## 1. Project Overview

**LexAI** is a mobile application that enables legal professionals and individuals to upload legal documents (PDFs), receive AI-generated summaries, risk analyses, key-point extraction, obligation tracking, and interact with a document-aware AI chat assistant — all in plain language.

### Core Features
| Feature | Description |
|---|---|
| **PDF Upload** | Pick or photograph legal documents (max 10 MB) |
| **AI Analysis** | Full summary, key points, risk detection, obligations |
| **Risk Scoring** | Numeric risk score (0–100) with high/medium/low classification |
| **Multi-language** | Supports English, Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati |
| **AI Chat** | Context-aware chat with follow-up suggestions, quoted clauses, disclaimers |
| **Chat Persistence** | Conversations stored locally via AsyncStorage |
| **Dark Mode** | Full light/dark theme support |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 via **Expo ~54** |
| Language | TypeScript ~5.9 |
| Routing | **expo-router ~6** (file-based routing) |
| Navigation | @react-navigation (bottom tabs + stack) |
| State | React Context + `useReducer` (Flux pattern) |
| HTTP | **Axios** (multipart upload + JSON) |
| Storage | @react-native-async-storage/async-storage |
| Animations | react-native-reanimated ~4.1 |
| Styling | NativeWind 4 + React Native `StyleSheet` |
| File Picker | expo-document-picker + expo-file-system |
| Icons | @expo/vector-icons (Ionicons) |
| Haptics | expo-haptics |

---

## 3. Directory Structure

```
front-end/MyApp/
├── app/                          # Expo Router — file-based routes
│   ├── _layout.tsx               # Root layout (ThemeProvider + DocumentProvider + Stack)
│   ├── error.tsx                  # Global error boundary screen
│   ├── modal.tsx                  # Generic modal screen
│   ├── (tabs)/                   # Bottom tab navigator
│   │   ├── _layout.tsx           # Tab bar config (Home + Upload)
│   │   ├── index.tsx             # Home screen
│   │   ├── upload.tsx            # Upload & analysis screen
│   │   └── explore.tsx           # Expo default explore/info screen
│   ├── chat/
│   │   └── [documentId].tsx      # AI chat screen (dynamic route)
│   └── summary/
│       └── [documentId].tsx      # Document summary/report screen (dynamic route)
│
├── components/
│   ├── chat/                     # Chat-specific components
│   │   ├── ChatInput.tsx         # Text input with quick actions & send button
│   │   ├── MessageBubble.tsx     # User/AI message bubble with suggestions
│   │   ├── SuggestedQuestions.tsx # Chip list of suggested questions
│   │   └── TypingIndicator.tsx   # Animated "LexAI is analyzing..." dots
│   ├── document/                 # Document-specific components
│   │   ├── KeyPointCard.tsx      # Numbered key point with importance badge
│   │   ├── RiskCard.tsx          # Risk item with level bar & recommendation
│   │   ├── SummaryCard.tsx       # AI summary display card
│   │   └── UploadCard.tsx        # Drag-style upload box with file info
│   ├── ui/                       # Reusable UI primitives
│   │   ├── Badge.tsx             # Toned pill badge (neutral/accent/warning/success/danger)
│   │   ├── Button.tsx            # Multi-variant button (primary/secondary/outline/ghost)
│   │   ├── Card.tsx              # Themed card container with shadow
│   │   ├── ProgressBar.tsx       # Animated progress bar (reanimated)
│   │   ├── RiskBadge.tsx         # Circular risk score display
│   │   ├── collapsible.tsx       # Expandable section
│   │   ├── icon-symbol.tsx       # Cross-platform SF Symbol / MaterialIcon
│   │   └── icon-symbol.ios.tsx   # iOS-specific SF Symbol implementation
│   ├── external-link.tsx         # Opens URL in system browser
│   ├── haptic-tab.tsx            # Tab button with haptic feedback
│   ├── hello-wave.tsx            # Animated waving hand (demo)
│   ├── parallax-scroll-view.tsx  # Parallax header scroll view
│   ├── themed-text.tsx           # Theme-aware Text component
│   └── themed-view.tsx           # Theme-aware View component
│
├── context/
│   └── document-context.tsx      # Global state: documents, chat, loading, errors
│
├── hooks/
│   ├── useChat.ts                # Chat logic: send, receive, persist, clear
│   ├── useDocumentAnalysis.ts    # Upload + analyze with abort support
│   ├── useFileUpload.ts          # File picker state management
│   ├── use-color-scheme.ts       # Native color scheme hook
│   ├── use-color-scheme.web.ts   # Web color scheme hook
│   └── use-theme-color.ts        # Single theme color resolver
│
├── services/
│   ├── documentProcessor.ts      # PDF file picking, validation, size formatting
│   └── legalAI.ts                # API client: upload, chat, getSummary
│
├── storage/
│   └── chatStorage.ts            # AsyncStorage CRUD for chat messages
│
├── types/
│   ├── chat.ts                   # ChatMessage, ChatApiResponse, ChatHistoryItem
│   └── document.ts               # DocumentFile, DocumentAnalysis, AnalysisOptions, etc.
│
├── constants/
│   ├── colors.ts                 # AppColors (light/dark palettes), Radius, RiskLevelColors
│   ├── prompts.ts                # AI disclaimer, follow-ups, suggested questions by doc type
│   └── theme.ts                  # Legacy Colors, platform-specific Fonts
│
├── assets/                       # Images, icons, splash
├── scripts/                      # Utility scripts
├── app.json                      # Expo config
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # NativeWind/Tailwind config
└── babel.config.js               # Babel config
```

---

## 4. Navigation & Routing

The app uses **expo-router** (file-based routing) with a Stack + Tabs architecture:

```
RootLayout (_layout.tsx)
├── ThemeProvider (light/dark)
└── DocumentProvider (global state)
    └── Stack
        ├── (tabs) ─── Tab Navigator
        │   ├── index       → HomeScreen
        │   └── upload      → UploadScreen
        ├── summary/[documentId] → SummaryScreen
        ├── chat/[documentId]    → ChatScreen
        └── modal                → ModalScreen
```

### Route Parameters
| Route | Param | Purpose |
|---|---|---|
| `/summary/[documentId]` | `documentId: string` | Load & display analysis for a specific document |
| `/chat/[documentId]` | `documentId: string` | Open AI chat scoped to a specific document |

---

## 5. State Management

### Architecture: React Context + `useReducer`

All global state lives in `DocumentProvider` via a single reducer.

### State Shape (`DocumentState`)
```typescript
{
  currentDocumentId?: string;
  documents: Record<string, DocumentRecord>;    // keyed by documentId
  chatByDocument: Record<string, ChatMessage[]>; // keyed by documentId
  loading: { uploading: boolean; analyzing: boolean; chatting: boolean };
  errors: { upload?: string; summary?: string; chat?: string };
}
```

### Actions (8 total)
| Action | Purpose |
|---|---|
| `SET_CURRENT_DOCUMENT` | Set active document ID |
| `UPSERT_DOCUMENT` | Insert or update a `DocumentRecord` |
| `SET_DOCUMENT_ANALYSIS` | Attach analysis to an existing document |
| `SET_CHAT_HISTORY` | Replace entire chat array for a document |
| `ADD_CHAT_MESSAGE` | Append a single message to a document's chat |
| `SET_LOADING` | Partial update to loading flags |
| `SET_ERROR` | Partial update to error messages |
| `CLEAR_ERROR` | Null out a specific error key |

---

## 6. Type System

### Document Types (`types/document.ts`)
| Type | Fields |
|---|---|
| `DocumentFile` | `uri`, `name`, `size`, `mimeType` |
| `AnalysisOptions` | `fullSummary`, `riskAnalysis`, `enableChat`, `translateSummary`, `language` |
| `DocumentAnalysis` | `summary`, `keyPoints[]`, `risks[]`, `obligations[]`, `riskScore?`, `documentType?` |
| `DocumentRecord` | `documentId`, `filename`, `language`, `uploadedAt`, `pages?`, `location?`, `analysis?` |
| `DocumentRisk` | `id`, `title`, `description`, `recommendation?`, `level` (high/medium/low) |
| `KeyPoint` | `id`, `text`, `importance` (critical/important/note) |
| `Obligation` | `id`, `action`, `deadline?`, `urgency?` |
| `DocumentLanguage` | Union of 7 Indian languages + English |
| `RiskLevel` | `'high' \| 'medium' \| 'low'` |

### Chat Types (`types/chat.ts`)
| Type | Fields |
|---|---|
| `ChatMessage` | `id`, `sender`, `message`, `timestamp`, `quotedClause?`, `followUpSuggestions?`, `sources?`, `disclaimer?` |
| `ChatApiResponse` | `reply`, `sources?`, `disclaimer?`, `followUpSuggestions?` |
| `ChatHistoryItem` | `sender`, `message` (minimal shape sent to API) |

---

## 7. API Layer (`services/legalAI.ts`)

All API calls go through an **Axios** client configured with:
- **Base URL**: `process.env.EXPO_PUBLIC_API_BASE_URL`
- **Timeout**: 20 seconds

### Endpoints

| Function | Method | Endpoint | Payload | Returns |
|---|---|---|---|---|
| `uploadAndAnalyze()` | POST | `/api/documents/upload` | `FormData` (file + options JSON) | `UploadResponse` |
| `sendChatMessage()` | POST | `/api/chat/message` | `{ documentId, message, conversationHistory }` | `ChatApiResponse` |
| `getSummary()` | GET | `/api/documents/:id/summary` | — | `SummaryResponse` |

### Upload Flow
1. File is attached as `multipart/form-data` with the `file` field
2. `AnalysisOptions` is JSON-stringified and sent as the `options` field
3. Supports `AbortController` for cancellation

---

## 8. Custom Hooks

### `useFileUpload()`
Manages local file picker state: `file`, `error`, `isPicking`, `pickFile()`, `removeFile()`.
- Uses `expo-document-picker` to select PDFs only
- Validates file type (`.pdf` / `application/pdf`) and size (≤ 10 MB)

### `useDocumentAnalysis()`
Orchestrates the full upload → analyze pipeline:
- Dispatches loading/error states to context
- Calls `uploadAndAnalyze()` with abort support
- On success: upserts document record + sets current document
- On cancel: shows "Analysis cancelled" message
- Returns `documentId` on success, `null` on failure

### `useChat(documentId)`
Full chat lifecycle management:
- **Init**: Loads persisted messages from AsyncStorage on mount
- **Send**: Creates user message → dispatches to context → calls API → creates AI message with follow-ups/disclaimer
- **Persist**: Saves to AsyncStorage after each send/receive
- **Clear**: Wipes chat from both context and storage
- Returns `{ messages, isChatting, sendMessage, clearMessages }`

---

## 9. Screen-by-Screen Logic

### Home Screen (`app/(tabs)/index.tsx`)
- Displays branded header ("LexAI — Legal Document AI")
- Hero card with CTA to upload a PDF
- **Recent Documents** list (currently hardcoded with 2 dummy entries)
- Each document card has a "View summary" button → navigates to `/summary/[documentId]`

### Upload Screen (`app/(tabs)/upload.tsx`)
- **UploadCard**: Dashed border drop zone with "Choose PDF File" and "Take Photo" options
- **Language selector**: Horizontal pill row (7 languages)
- **Analysis options**: Toggle switches for Full Summary, Risk Analysis, AI Chat, Translate
- **Analyze button**: Triggers `handleAnalyze()` → calls `analyzeDocument()` → on success navigates to summary
- **Progress modal**: 5-step animated overlay during analysis:
  1. Reading your document...
  2. Identifying document type...
  3. AI analyzing content...
  4. Detecting risks...
  5. Preparing your report...
- Progress auto-advances every 1.2s with animated `ProgressBar`

### Summary Screen (`app/summary/[documentId].tsx`)
- **Header**: Document filename + "AI Summary Report" subtitle + share button
- **Info card**: Document type badge + circular `RiskBadge` (score) + metadata pills
- **Action row**: Share, Chat, Copy, Export buttons (Chat navigates to chat screen)
- **4 tabs** (Summary | Key Points | Risks | Obligations):
  - **Summary**: `SummaryCard` + accordion of plain-language explanations
  - **Key Points**: Numbered `KeyPointCard` list with importance badges (critical/important/note)
  - **Risks**: `RiskCard` list with color-coded level bars + recommendations
  - **Obligations**: Checklist-style cards with deadline display + "Add to calendar" links
- **FAB**: Floating "Ask AI" button → navigates to chat
- **Data loading**: If no cached analysis, calls `getSummary()` API on mount
- **Risk mapping**: Score ≥70 = high, ≥40 = medium, <40 = low

### Chat Screen (`app/chat/[documentId].tsx`)
- **Header**: Document filename + "AI Legal Assistant" + clear chat button
- **Context banner**: "I am answering based on your uploaded document..."
- **Message list** (`FlatList`):
  - Empty state: large icon + "Ask about your document" + `SuggestedQuestions`
  - Messages rendered as `MessageBubble` (user right-aligned, AI left-aligned)
  - AI messages include: label, quoted clauses, disclaimer, follow-up suggestion chips
  - Footer: `TypingIndicator` while AI is responding
- **Input area** (`ChatInput`):
  - Multiline input (max 500 chars) with character counter
  - Quick action chips on focus: Summarize, Find Risks, Deadlines, Explain Clause, Simplify
  - Attach button (navigates to upload) + send button
- **Suggested questions**: Dynamic per document type (petition/affidavit/notice/contract/default)

---

## 10. Component Library

### UI Primitives

| Component | Props | Behavior |
|---|---|---|
| `Button` | `label, onPress, variant, disabled, loading, style` | 4 variants: primary, secondary, outline, ghost. Loading shows spinner. Elevated shadow on primary/secondary. |
| `Card` | `children, style, ...ViewProps` | Themed container with border, shadow, rounded corners (`Radius.standard = 10`) |
| `Badge` | `label, tone, style` | 5 tones: neutral, accent, warning, success, danger. Pill shape. |
| `RiskBadge` | `level, score` | 64px circle with score number + "Risk Score" label, border color by level |
| `ProgressBar` | `progress (0–1)` | Animated fill bar using `react-native-reanimated` shared values |

### Chat Components

| Component | Props | Behavior |
|---|---|---|
| `ChatInput` | `onSend, onAttach, quickActions[]` | Multiline input + attach + send. Quick action chips shown on focus. |
| `MessageBubble` | `message, onSuggestionPress` | User/AI bubble. AI shows label, quoted clause block, disclaimer, follow-up chips. Asymmetric corner radii. |
| `SuggestedQuestions` | `questions[], onSelect` | Wrapped chip row for initial suggested questions |
| `TypingIndicator` | — | 3 animated dots + "LexAI is analyzing..." text |

### Document Components

| Component | Props | Behavior |
|---|---|---|
| `UploadCard` | `file, onPick, onRemove, onCamera` | Dashed upload zone with file preview row showing name + size + remove |
| `SummaryCard` | `summary: string` | Accent-tinted card with "AI SUMMARY" label |
| `KeyPointCard` | `point, index` | Numbered circle + text + importance badge |
| `RiskCard` | `risk` | Color-coded level bar + title + description + recommendation |

---

## 11. Theming & Design System

### Color Palette (`constants/colors.ts`)

| Token | Light | Dark |
|---|---|---|
| `primary` | `#061633` (deep navy) | `#D7E2FF` (light blue) |
| `accent` | `#F5C84B` (gold) | `#F5C84B` (gold) |
| `accentSoft` | `#FFF2CC` | `#3B2F12` |
| `background` | `#F8FAFF` | `#0B1222` |
| `surface` | `#FFFFFF` | `#121B2E` |
| `border` | `#D3DBEA` | `#25324C` |
| `highRisk` | `#C0392B` | `#E16A5E` |
| `mediumRisk` | `#E67E22` | `#F0A24E` |
| `lowRisk` | `#1A7A4A` | `#57B27B` |

### Design Tokens
```typescript
Radius = { standard: 10, pill: 20, bubble: 18 }
```

### Fonts (Platform-specific)
- **iOS**: system-ui, ui-serif, ui-rounded, ui-monospace
- **Android**: normal, serif, normal, monospace
- **Web**: system-ui stack, Georgia, SF Pro Rounded, SFMono-Regular

---

## 12. Local Storage

### Chat Persistence (`storage/chatStorage.ts`)
- **Key format**: `chat:{documentId}`
- **Operations**: `loadChatMessages()`, `saveChatMessages()`, `clearChatMessages()`
- Uses `@react-native-async-storage/async-storage`
- Messages are JSON serialized/deserialized with graceful error handling

---

## 13. Suggested Questions System

Questions are dynamically selected based on `document.analysis.documentType`:

| Document Type | Example Questions |
|---|---|
| **Petition** | "What relief is being sought?", "What do I need to do next?" |
| **Affidavit** | "Am I required to respond?", "What facts are stated here?" |
| **Notice** | "What is the deadline to respond?", "Is this enforceable?" |
| **Contract** | "What are my obligations?", "How can I terminate?" |
| **Default** | "What is this document about?", "What are my risks?" |

---

## 14. Error Handling

| Layer | Strategy |
|---|---|
| **Global** | `error.tsx` — Error boundary with retry + go home buttons |
| **Upload** | Try/catch in `useDocumentAnalysis` → dispatches `SET_ERROR` with `upload` key |
| **Chat** | Try/catch in `useChat.sendMessage` → dispatches `SET_ERROR` with `chat` key |
| **Summary** | Local `error` state in `SummaryScreen` with inline error card |
| **File Picker** | Returns discriminated union: `{ file }` / `{ error }` / `{ cancelled }` |
| **Cancellation** | `AbortController` support; cancelled requests show friendly message |

---

## 15. Environment Configuration

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Backend API base URL (fallback: empty string) |

Set in `.env` or Expo config for different environments.

---

## 16. Data Flow Diagram

```
User picks PDF
       │
       ▼
 useFileUpload.pickFile()
  └── documentProcessor.pickPdfFile()
       └── expo-document-picker → validate type/size
              │
              ▼
      Upload Screen (file state)
       │  User taps "Analyze"
       ▼
 useDocumentAnalysis.analyzeDocument(file, options)
  ├── dispatch SET_LOADING
  ├── legalAI.uploadAndAnalyze() ──► POST /api/documents/upload
  │         │
  │         ▼
  ├── dispatch UPSERT_DOCUMENT (with analysis)
  ├── dispatch SET_CURRENT_DOCUMENT
  └── router.push → /summary/[documentId]
              │
              ▼
      Summary Screen
  ├── Reads from context (state.documents[id])
  ├── Falls back to legalAI.getSummary() if no cached analysis
  └── User taps "Ask AI" FAB
              │
              ▼
      Chat Screen
  ├── useChat(documentId)
  │   ├── loadChatMessages() from AsyncStorage
  │   ├── sendMessage(text)
  │   │   ├── Create user ChatMessage → dispatch SET_CHAT_HISTORY
  │   │   ├── legalAI.sendChatMessage() ──► POST /api/chat/message
  │   │   ├── Create AI ChatMessage (with follow-ups, disclaimer)
  │   │   └── saveChatMessages() to AsyncStorage
  │   └── clearMessages() → wipe context + storage
  └── Renders MessageBubble list + ChatInput
```

---

## 17. Build & Run

```bash
# Install dependencies
cd front-end/MyApp
npm install

# Start dev server
npx expo start

# Platform-specific
npx expo start --ios
npx expo start --android
npx expo start --web
```

### Expo Config Highlights (`app.json`)
- **New Architecture**: enabled (`newArchEnabled: true`)
- **Typed Routes**: enabled (`experiments.typedRoutes: true`)
- **React Compiler**: enabled (`experiments.reactCompiler: true`)
- **Orientation**: Portrait only
- **Scheme**: `myapp` (deep linking)
