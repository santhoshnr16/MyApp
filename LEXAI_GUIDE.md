# LexAI Guide

## Project Snapshot
LexAI is a React Native (Expo Router) legal document assistant. It focuses on PDF upload, AI summary, and document-aware chat for Indian legal professionals.

Tech stack highlights:
- React Native + Expo Router
- TypeScript strict mode
- NativeWind (optional utility styling)
- Axios for API calls
- Reanimated for motion
- Expo Document Picker + File System

## Navigation and Navbar
- Each screen uses a custom top navbar with a left back icon, centered title block, and a right-side action.
- Titles are left aligned within the header content block and paired with a short subtitle when relevant.
- Keep the header visually strong with a deep navy background and crisp white text for contrast.
- Bottom tabs use a taller bar with subtle elevation and compact Ionicons.

Navbar locations:
- Upload: [app/(tabs)/upload.tsx](app/(tabs)/upload.tsx)
- Summary: [app/summary/[documentId].tsx](app/summary/[documentId].tsx)
- Chat: [app/chat/[documentId].tsx](app/chat/[documentId].tsx)
- Tabs layout: [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx)

## Icons
- Icon set: Ionicons from @expo/vector-icons
- Typical sizes: 20 for header buttons, 22 for tabs, 16 to 18 for secondary actions
- Keep icons inside circular or pill-shaped containers for a premium look

## Alignment Rules
- Default alignment is left for titles, subtitles, and body text.
- Section headers use a short vertical accent bar to anchor the eye.
- Cards and content blocks have consistent horizontal padding (16 to 20).
- Keep call-to-action buttons full width on mobile for strong visual hierarchy.

## Contrast Palette
Primary tokens are defined in [constants/colors.ts](constants/colors.ts):
- Primary (navy): #061633
- Accent (gold): #F5C84B
- Background: #F8FAFF
- Surface: #FFFFFF
- Border: #D3DBEA
- Text Primary: #061633
- Text Secondary: #243B6B
- Text Muted: #5B6E9A

## UI Building Blocks
- Buttons: [components/ui/Button.tsx](components/ui/Button.tsx)
- Cards: [components/ui/Card.tsx](components/ui/Card.tsx)
- Upload card: [components/document/UploadCard.tsx](components/document/UploadCard.tsx)
- Chat input and bubbles: [components/chat/ChatInput.tsx](components/chat/ChatInput.tsx), [components/chat/MessageBubble.tsx](components/chat/MessageBubble.tsx)

## Practical UI Principles
- Use contrast first: navy backgrounds, white text, gold accents.
- Keep spacing consistent and avoid center alignment for body copy.
- Use small icon badges and accent chips to add visual interest without clutter.
