export type TaskType = 'EXPLAIN_TERM' | 'ANSWER_FAQ' | 'TRANSLATE_DOC' | 'STATUS_EXPLAIN' | 'ESCALATE' | 'UNKNOWN';
export type EducationLevel = 'basic' | 'intermediate' | 'educated';
export type Sentiment = 'good' | 'bad' | 'neutral' | 'depends';
export type CaseHealth = 'on track' | 'slightly delayed' | 'concerning';
export type Urgency = 'routine' | 'soon' | 'urgent';
export type Confidence = 'high' | 'medium' | 'low';
export type Emotion = 'neutral' | 'confused' | 'stressed' | 'angry';

export type AssistContext = {
  clientName: string;
  lawyerName: string;
  caseType: string;
  caseSummary: string;
  preferredLanguage: string;
  educationLevel: EducationLevel;
};

// Section A
export type ExplainTermResponse = {
  term: string;
  simpleDefinition: string;
  analogy: string;
  inYourCase: string | null;
  sentiment: Sentiment;
  sentimentReason: string;
  whatNext: string;
  questionForLawyer: string;
  relatedTerms: string[];
  reassurance: string;
};

// Section B
export type AnswerFAQResponse = {
  question: string;
  canAnswer: boolean;
  answer: string;
  inYourSituation: string | null;
  limitation: string | null;
  askLawyerThis: string;
  reassurance: string;
  confidence: Confidence;
  isCommon: boolean;
  isCommonNote: string | null;
};

// Section C
export type TranslateDocResponse = {
  originalText: string;
  plainEnglish: string;
  keyNumbers: string[];
  yourRights: string[];
  yourObligations: string[];
  restrictions: string[];
  isItGoodForYou: boolean | 'neutral';
  shouldBeWorried: boolean;
  worryReason: string | null;
  keyPoint: string;
  askLawyerThis: string;
};

// Section D
export type StatusExplainResponse = {
  currentStage: string;
  stageNumber: number;
  whatHappened: string;
  caseHealth: CaseHealth;
  caseHealthReason: string;
  whatComesNext: string;
  nextHearingPurpose: string;
  doesClientNeedToDo: boolean;
  clientAction: string | null;
  clientActionDeadline: string | null;
  estimatedTimeline: string;
  delayReason: string | null;
  reassurance: string;
};

// Section E
export type EscalateResponse = {
  clientQuestion: string;
  acknowledgement: string;
  generalAnswer: string;
  whyCannotAnswerFully: string;
  lawyerMessageSubject: string;
  lawyerMessageBody: string;
  urgency: Urgency;
  urgencyReason: string | null;
  reassurance: string;
};

// Section F
export type UnknownResponse = {
  detectedIntent: string;
  detectedEmotion: Emotion;
  response: string;
  suggestedQuestions: string[];
};

export type AssistResponse =
  | { taskType: 'EXPLAIN_TERM'; data: ExplainTermResponse }
  | { taskType: 'ANSWER_FAQ'; data: AnswerFAQResponse }
  | { taskType: 'TRANSLATE_DOC'; data: TranslateDocResponse }
  | { taskType: 'STATUS_EXPLAIN'; data: StatusExplainResponse }
  | { taskType: 'ESCALATE'; data: EscalateResponse }
  | { taskType: 'UNKNOWN'; data: UnknownResponse };

export type AssistHistoryItem = {
  id: string;
  taskType: TaskType;
  input: string;
  response: AssistResponse;
  sources?: string[];
  timestamp: string;
};
