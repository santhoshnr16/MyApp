const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b-instruct-q4_K_M';

app.use(cors());
app.use(express.json());

// Allow 3 minutes for Ollama responses
app.use((req, res, next) => {
  res.setTimeout(180000);
  next();
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// In-memory store: documentId -> { text, analysis, filename, uploadedAt }
const documentStore = new Map();

// ─── Ollama helper ────────────────────────────────────────────────────────────

async function ollamaChat(messages, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150000);
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: { temperature: 0.3, num_predict: 1500, ...options },
    }),
  });
  clearTimeout(timer);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.message?.content ?? '';
}

// ─── Analysis prompt ──────────────────────────────────────────────────────────

function buildAnalysisPrompt(text, options, language) {
  const truncated = text.slice(0, 6000);
  return `You are LexAI, an expert Indian legal document analyser. Analyse this legal document and return ONLY a valid JSON object. No markdown, no explanation, just raw JSON.

DOCUMENT TEXT:
${truncated}

ANALYSIS OPTIONS: ${JSON.stringify(options)}
OUTPUT LANGUAGE: ${language || 'English'}

Return this exact JSON structure:
{
  "summary": "2-3 sentence plain English summary of the document",
  "documentType": "one of: petition, affidavit, notice, contract, agreement, deed, order, judgment, other",
  "riskScore": <integer 0-100, higher means more risk>,
  "keyPoints": [
    { "id": "kp1", "text": "key point text", "importance": "critical|important|note" },
    { "id": "kp2", "text": "key point text", "importance": "critical|important|note" }
  ],
  "risks": [
    { "id": "r1", "title": "Risk title", "description": "Description", "recommendation": "What to do", "level": "high|medium|low" }
  ],
  "obligations": [
    { "id": "o1", "action": "What must be done", "deadline": "date if mentioned or null", "urgency": "high|medium|low" }
  ]
}

Rules:
- keyPoints: minimum 3, maximum 8
- risks: minimum 2, maximum 6 (only real risks from the document)
- obligations: 1-5 items
- riskScore: base on number and severity of risks found
- ALL text in ${language || 'English'}
- Return ONLY the JSON, nothing else`;
}

function buildChatPrompt(documentText, message, history) {
  const truncated = documentText.slice(0, 4000);
  return `You are LexAI, an AI legal assistant for Indian law. You have read the following legal document:

DOCUMENT:
${truncated}

Answer the user's question based ONLY on this document. Be concise and clear. If you cannot answer from the document, say so.

At the end of your answer, suggest 2-3 follow-up questions the user might ask, formatted as:
FOLLOWUPS: ["question1", "question2", "question3"]`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ollama: OLLAMA_BASE, model: OLLAMA_MODEL });
});

// Upload & analyse PDF
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let options = {};
    try {
      options = JSON.parse(req.body.options || '{}');
    } catch {
      options = {};
    }

    // Extract text from PDF
    let pdfText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      pdfText = pdfData.text || '';
    } catch (err) {
      return res.status(422).json({ error: 'Could not read PDF. Make sure it is a valid PDF with text.' });
    }

    if (pdfText.trim().length < 50) {
      return res.status(422).json({ error: 'PDF appears to be empty or image-only. Please use a text-based PDF.' });
    }

    const language = options.language || 'English';
    const prompt = buildAnalysisPrompt(pdfText, options, language);

    const aiResponse = await ollamaChat([
      { role: 'user', content: prompt },
    ], { temperature: 0.2, num_predict: 1500 });

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback if parsing fails
      analysis = {
        summary: aiResponse.slice(0, 300) || 'Analysis complete.',
        documentType: 'other',
        riskScore: 50,
        keyPoints: [{ id: 'kp1', text: 'Document uploaded successfully', importance: 'note' }],
        risks: [{ id: 'r1', title: 'Manual Review Needed', description: 'AI could not parse structured response', recommendation: 'Read document manually', level: 'medium' }],
        obligations: [],
      };
    }

    const documentId = uuidv4();
    documentStore.set(documentId, {
      text: pdfText,
      analysis,
      filename: req.file.originalname || 'document.pdf',
      uploadedAt: new Date().toISOString(),
      language,
    });

    return res.json({
      documentId,
      summary: analysis.summary,
      documentType: analysis.documentType,
      riskScore: analysis.riskScore,
      keyPoints: analysis.keyPoints || [],
      risks: analysis.risks || [],
      obligations: analysis.obligations || [],
    });
  } catch (err) {
    console.error('Upload error:', err);
    if (err.message?.includes('Ollama')) {
      return res.status(503).json({ error: 'AI service unavailable. Make sure Ollama is running.' });
    }
    return res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// Get summary
app.get('/api/documents/:documentId/summary', (req, res) => {
  const doc = documentStore.get(req.params.documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  return res.json({
    summary: doc.analysis.summary,
    documentType: doc.analysis.documentType,
    riskScore: doc.analysis.riskScore,
    keyPoints: doc.analysis.keyPoints || [],
    risks: doc.analysis.risks || [],
    obligations: doc.analysis.obligations || [],
  });
});

// Chat
app.post('/api/chat/message', async (req, res) => {
  try {
    const { documentId, message, conversationHistory } = req.body;
    if (!documentId || !message) {
      return res.status(400).json({ error: 'documentId and message required' });
    }

    const doc = documentStore.get(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found. Please re-upload.' });
    }

    const systemPrompt = `You are LexAI, an expert Indian legal AI assistant. You have read this document:

DOCUMENT SUMMARY: ${doc.analysis.summary}
DOCUMENT TYPE: ${doc.analysis.documentType}

FULL DOCUMENT TEXT:
${doc.text.slice(0, 4000)}

Answer questions based ONLY on this document. Be concise. Always add this disclaimer at the end: "[AI Analysis — Not legal advice]"

At the end, on a new line, suggest 2-3 follow-up questions as JSON: FOLLOWUPS: ["q1","q2","q3"]`;

    const history = (conversationHistory || []).slice(-8).map((h) => ({
      role: h.sender === 'user' ? 'user' : 'assistant',
      content: h.message,
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    const aiResponse = await ollamaChat(messages, { temperature: 0.4, num_predict: 600 });

    let reply = aiResponse;
    let followUpSuggestions = [];

    const followupMatch = aiResponse.match(/FOLLOWUPS:\s*(\[[\s\S]*?\])/);
    if (followupMatch) {
      try {
        followUpSuggestions = JSON.parse(followupMatch[1]);
        reply = aiResponse.replace(/FOLLOWUPS:[\s\S]*$/, '').trim();
      } catch {
        // keep full response
      }
    }

    return res.json({
      reply,
      followUpSuggestions,
      disclaimer: 'This is AI analysis, not legal advice. Consult a qualified lawyer.',
    });
  } catch (err) {
    console.error('Chat error:', err);
    if (err.message?.includes('Ollama')) {
      return res.status(503).json({ error: 'AI service unavailable.' });
    }
    return res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

// ─── ClientAssist Route ───────────────────────────────────────────────────────

app.post('/api/client/assist', async (req, res) => {
  try {
    const { taskType, input, context, documentId } = req.body;
    if (!taskType || !input) {
      return res.status(400).json({ error: 'taskType and input required' });
    }

    const ctx = context || {};
    const clientName = ctx.clientName || 'this client';
    const lawyerName = ctx.lawyerName || 'your lawyer';
    const caseType = ctx.caseType || 'general legal matter';
    const caseSummary = ctx.caseSummary || 'not provided';
    const language = ctx.preferredLanguage || 'English';
    const education = ctx.educationLevel || 'intermediate';

    // Optionally include document text for context
    let docContext = '';
    if (documentId && documentStore.has(documentId)) {
      const doc = documentStore.get(documentId);
      docContext = `\nRELATED DOCUMENT SUMMARY: ${doc.analysis?.summary || 'Not available'}\nDOCUMENT TYPE: ${doc.analysis?.documentType || 'Unknown'}`;
    }

    const sectionMap = {
      EXPLAIN_TERM: 'A',
      ANSWER_FAQ: 'B',
      TRANSLATE_DOC: 'C',
      STATUS_EXPLAIN: 'D',
      ESCALATE: 'E',
      UNKNOWN: 'F',
    };

    const sectionInstructions = {
      EXPLAIN_TERM: `Explain the legal term "${input}". Return JSON: {"term":"...","simpleDefinition":"one sentence no jargon","analogy":"Indian daily life comparison","inYourCase":${caseSummary !== 'not provided' ? '"connect to their case"' : 'null'},"sentiment":"good|bad|neutral|depends","sentimentReason":"why","whatNext":"one sentence","questionForLawyer":"WhatsApp-ready question","relatedTerms":["term1","term2","term3"],"reassurance":"calming closing line"}`,

      ANSWER_FAQ: `Answer this FAQ: "${input}". Return JSON: {"question":"rephrased clearly","canAnswer":true,"answer":"plain English answer","inYourSituation":${caseSummary !== 'not provided' ? '"connect to case"' : 'null'},"limitation":null,"askLawyerThis":"exact question to forward","reassurance":"calming one-liner","confidence":"high|medium|low","isCommon":true,"isCommonNote":"This is very common in cases like yours"}`,

      TRANSLATE_DOC: `Translate this legal text to plain English: "${input}". Return JSON: {"originalText":"exact input text","plainEnglish":"simple translation","keyNumbers":["any amounts dates deadlines"],"yourRights":["rights mentioned"],"yourObligations":["what client must do"],"restrictions":["what client cannot do"],"isItGoodForYou":true,"shouldBeWorried":false,"worryReason":null,"keyPoint":"single most important takeaway","askLawyerThis":"question if worried"}`,

      STATUS_EXPLAIN: `Explain this case status/hearing note in plain language: "${input}". Return JSON: {"currentStage":"plain English stage","stageNumber":5,"whatHappened":"last hearing in story form","caseHealth":"on track|slightly delayed|concerning","caseHealthReason":"why","whatComesNext":"next step plain English","nextHearingPurpose":"what next date is for","doesClientNeedToDo":false,"clientAction":null,"clientActionDeadline":null,"estimatedTimeline":"realistic range like 6-18 months","delayReason":null,"reassurance":"calming closing line"}`,

      ESCALATE: `This question needs lawyer judgment: "${input}". Return JSON: {"clientQuestion":"their question clearly stated","acknowledgement":"warm one-liner","generalAnswer":"background info you can share","whyCannotAnswerFully":"gentle explanation","lawyerMessageSubject":"WhatsApp subject","lawyerMessageBody":"complete ready-to-send message with greeting, question, polite closing","urgency":"routine|soon|urgent","urgencyReason":null,"reassurance":"calming closing line"}`,

      UNKNOWN: `Handle this unclear message: "${input}". Return JSON: {"detectedIntent":"what client seems to want","detectedEmotion":"neutral|confused|stressed|angry","response":"appropriate redirect","suggestedQuestions":["q1","q2","q3"]}`,
    };

    const instruction = sectionInstructions[taskType] || sectionInstructions.UNKNOWN;

    const prompt = `You are LexAI Client Assistant — a legal communication specialist. You explain legal concepts to ordinary people in India in plain, warm language. You are NOT a lawyer and never give legal advice or predictions.

CLIENT: ${clientName}
LAWYER: ${lawyerName}
CASE TYPE: ${caseType}
CASE SUMMARY: ${caseSummary}
LANGUAGE: ${language}
EDUCATION LEVEL: ${education}${docContext}

TASK: ${instruction}

RULES:
- Output ONLY valid JSON, no text outside JSON
- No jargon in explanations — use simple Indian English
- Be warm, calm, reassuring
- Never predict outcomes, never give strategy
- Always include reassurance
- Education level "${education}": ${education === 'basic' ? 'very short sentences, zero legal terms, use home/family/market analogies' : education === 'educated' ? 'normal paragraphs, brief explanation of legal terms' : 'short paragraphs, minimal legal terms with immediate explanation'}

Return ONLY the JSON object:`;

    const result = await ollamaChat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, num_predict: 1200 }
    );

    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({ error: 'Could not parse AI response', raw: result });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return res.status(422).json({ error: 'Invalid JSON from AI', raw: result.slice(0, 500) });
    }

    return res.json({ taskType, data: parsed });
  } catch (err) {
    console.error('Client assist error:', err);
    if (err.message?.includes('Ollama')) {
      return res.status(503).json({ error: 'AI service unavailable.' });
    }
    return res.status(500).json({ error: err.message || 'Client assist failed' });
  }
});

// ─── NegotiationCounsel Route ─────────────────────────────────────────────────

app.post('/api/negotiate/analyse', async (req, res) => {
  try {
    const { documentId, context } = req.body;
    if (!documentId || !context) {
      return res.status(400).json({ error: 'documentId and context required' });
    }

    const doc = documentStore.get(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found. Please re-upload.' });
    }

    const truncated = doc.text.slice(0, 4000);
    const ctxStr = JSON.stringify(context);

    const prompt = `You are a senior Indian corporate lawyer with 25 years of experience. Analyse this contract for negotiation.

CONTRACT TYPE: ${context.contractType || doc.analysis?.documentType || 'Agreement'}
YOUR COMPANY: ${context.yourCompanyName} (${context.yourType})
COUNTERPARTY: ${context.counterpartyName} (${context.counterpartyType})
DEAL VALUE: ${context.dealValue}
DEAL DURATION: ${context.dealDuration}
INDUSTRY: ${context.industry}
JURISDICTION: ${context.jurisdiction || 'India'}
MARKET CONTEXT: ${context.marketContext}
NEGOTIATION PRIORITY: ${context.priority}
POWER DYNAMIC: ${context.powerDynamic}

CONTRACT TEXT:
${truncated}

Provide negotiation analysis in this EXACT format. Start immediately after the marker.

---NEGOTIATION_START---
POSTURE: [AGGRESSIVE or BALANCED or COLLABORATIVE or DEFENSIVE]
VERDICT: [YES with changes / NO walk away / MAYBE pending revisions]
RISK_SCORE: [0-100]

CLAUSE ISSUES:
1. [Clause Name] | Risk: HIGH/MEDIUM/LOW
   Issue: [What is wrong and why it matters]
   Counter: [Exact replacement language to propose]

2. [Clause Name] | Risk: HIGH/MEDIUM/LOW
   Issue: [What is wrong]
   Counter: [Counter-language]

3. [Clause Name] | Risk: HIGH/MEDIUM/LOW
   Issue: [What is wrong]
   Counter: [Counter-language]

DEAL_BREAKERS:
- [Issue that cannot be accepted]
- [Second deal-breaker if any]

QUICK_WINS:
- [Easy clause to push back on]
- [Second quick win]

PRIORITY_ACTIONS:
1. [Most critical change]
2. [Second priority]
3. [Third priority]

EMAIL_DRAFT:
Subject: ${context.contractType || 'Agreement'} - Review Comments

Dear ${context.counterpartyContact || 'Team'},

[Write 3 specific revision requests in professional tone based on the clause issues above]

Best regards,
${context.yourCompanyName}

FINAL_RECOMMENDATION:
[One clear paragraph with negotiation approach and must-change items]
---NEGOTIATION_END---`;

    const result = await ollamaChat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, num_predict: 2500 }
    );

    return res.json({ result });
  } catch (err) {
    console.error('Negotiate error:', err);
    if (err.message?.includes('Ollama')) {
      return res.status(503).json({ error: 'AI service unavailable.' });
    }
    return res.status(500).json({ error: err.message || 'Negotiation analysis failed' });
  }
});

// ─── DraftCounsel Routes ──────────────────────────────────────────────────────

// Stage 1: Generate document structure
app.post('/api/draft/structure', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const result = await ollamaChat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.1, num_predict: 1500 }
    );

    return res.json({ result });
  } catch (err) {
    console.error('Draft structure error:', err);
    if (err.message?.includes('Ollama')) {
      return res.status(503).json({ error: 'AI service unavailable.' });
    }
    return res.status(500).json({ error: err.message || 'Structure generation failed' });
  }
});

// Stage 3: Format document
app.post('/api/draft/format', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const result = await ollamaChat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.1, num_predict: 3000 }
    );

    return res.json({ result });
  } catch (err) {
    console.error('Draft format error:', err);
    if (err.message?.includes('Ollama')) {
      return res.status(503).json({ error: 'AI service unavailable.' });
    }
    return res.status(500).json({ error: err.message || 'Formatting failed' });
  }
});

// Stage 2: Draft full document
app.post('/api/draft/document', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const result = await ollamaChat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, num_predict: 2500 }
    );

    return res.json({ result });
  } catch (err) {
    console.error('Draft document error:', err);
    if (err.message?.includes('Ollama')) {
      return res.status(503).json({ error: 'AI service unavailable.' });
    }
    return res.status(500).json({ error: err.message || 'Document drafting failed' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nLexAI Backend running on http://localhost:${PORT}`);
  console.log(`Ollama: ${OLLAMA_BASE}  Model: ${OLLAMA_MODEL}`);
  console.log(`Health: http://localhost:${PORT}/health\n`);
});
