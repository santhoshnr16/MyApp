export const AI_DISCLAIMER =
  'This is AI analysis, not legal advice. Consult a qualified lawyer for legal decisions.';

export const DEFAULT_FOLLOW_UPS = ['Tell me more', 'What should I do?', 'Simplify this'];

export const SUGGESTED_QUESTIONS = {
  petition: [
    'What relief is being sought?',
    'What do I need to do next?',
    'Are there any deadlines?',
    'Who is the opposing party?',
    'What documents should I prepare?',
    'What happens if I do nothing?',
  ],
  affidavit: [
    'Am I required to respond?',
    'What facts are stated here?',
    'What are my rights?',
    'Is anything missing or inconsistent?',
    'What should I prepare as evidence?',
    'What are the next steps?',
  ],
  notice: [
    'What is the deadline to respond?',
    'What happens if I ignore this?',
    'Is this enforceable against me?',
    'What action is required from me?',
    'Who issued this notice?',
    'What are possible penalties?',
  ],
  contract: [
    'What are my obligations?',
    'Are there any risks or penalties?',
    'How can I terminate this agreement?',
    'What are the payment terms?',
    'Are there any renewal clauses?',
    'What happens on breach?',
  ],
  default: [
    'What is this document about?',
    'What do I need to do?',
    'Are there any deadlines?',
    'What are my risks?',
    'What obligations apply to me?',
    'What should I do next?',
  ],
} as const;
