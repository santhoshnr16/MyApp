const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const VAULT_UPLOADS_DIR = path.join(__dirname, 'vault-uploads');
if (!fs.existsSync(VAULT_UPLOADS_DIR)) fs.mkdirSync(VAULT_UPLOADS_DIR, { recursive: true });

const vaultStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VAULT_UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const vaultUpload = multer({ storage: vaultStorage, limits: { fileSize: 50 * 1024 * 1024 } });

const app = express();
const PORT = process.env.VAULT_PORT || 3002;
const JWT_SECRET = process.env.VAULT_JWT_SECRET || 'lexvault-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

app.use(cors());
app.use(express.json());

// ─── Stores ───────────────────────────────────────────────────────────────────
// Replace all Maps with Supabase queries when ready.

const users = new Map();          // userId  -> user object
const usersByEmail = new Map();   // email   -> userId
const cases = new Map();          // caseId  -> case object
const documents = new Map();      // docId   -> doc metadata
const caseDocuments = new Map();  // caseId  -> Array<docId>  (newest first)
const messages = new Map();       // msgId   -> message
const caseMessages = new Map();   // caseId  -> Array<msgId>  (oldest first)
const requests = new Map();       // reqId   -> request
const caseRequests = new Map();   // caseId  -> Array<reqId>

// Member tracking — two-direction + role
const userCases = new Map();       // userId  -> Set<caseId>
const caseUsers = new Map();       // caseId  -> Set<userId>
const memberRoles = new Map();     // `${caseId}:${userId}` -> { userId, name, email, role, addedAt, addedBy }
const userLastRead = new Map();    // `${caseId}:${userId}` -> ISO timestamp

// ─── Persistence Storage Setup ────────────────────────────────────────────────
const VAULT_USERS_PATH = path.join(__dirname, 'storage', 'vault_users.json');
const VAULT_CASES_PATH = path.join(__dirname, 'storage', 'vault_cases.json');

if (!fs.existsSync(path.dirname(VAULT_USERS_PATH))) {
  fs.mkdirSync(path.dirname(VAULT_USERS_PATH), { recursive: true });
}

function loadPersistedVaultData() {
  try {
    if (fs.existsSync(VAULT_USERS_PATH)) {
      const raw = fs.readFileSync(VAULT_USERS_PATH, 'utf8');
      const userList = JSON.parse(raw);
      userList.forEach((u) => {
        users.set(u.id, u);
        usersByEmail.set(u.email.toLowerCase(), u.id);
      });
      console.log(`[LexVault] Loaded ${users.size} registered users from disk storage.`);
    }
  } catch (err) {
    console.warn('[LexVault] Error loading persisted users:', err.message);
  }

  try {
    if (fs.existsSync(VAULT_CASES_PATH)) {
      const raw = fs.readFileSync(VAULT_CASES_PATH, 'utf8');
      const casesData = JSON.parse(raw);
      if (casesData.cases) {
        casesData.cases.forEach((c) => cases.set(c.id, c));
      }
      if (casesData.members) {
        casesData.members.forEach((m) => addMember(m.caseId, m.userId, m.role, m.addedBy));
      }
    }
  } catch (err) {
    console.warn('[LexVault] Error loading persisted cases:', err.message);
  }
}

function savePersistedVaultData() {
  try {
    const userList = Array.from(users.values());
    fs.writeFileSync(VAULT_USERS_PATH, JSON.stringify(userList, null, 2), 'utf8');
  } catch (err) {
    console.error('[LexVault] Failed saving user storage:', err.message);
  }
}

function savePersistedCasesData() {
  try {
    const caseList = Array.from(cases.values());
    const memberList = Array.from(memberRoles.entries()).map(([key, val]) => ({
      caseId: key.split(':')[0],
      ...val,
    }));
    fs.writeFileSync(VAULT_CASES_PATH, JSON.stringify({ cases: caseList, members: memberList }, null, 2), 'utf8');
  } catch (err) {
    console.error('[LexVault] Failed saving cases storage:', err.message);
  }
}

// Load accounts from storage on server boot
loadPersistedVaultData();

// ─── Member Helpers ───────────────────────────────────────────────────────────

function addMember(caseId, userId, role, addedBy) {
  const ucSet = userCases.get(userId) || new Set();
  ucSet.add(caseId);
  userCases.set(userId, ucSet);

  const cuSet = caseUsers.get(caseId) || new Set();
  cuSet.add(userId);
  caseUsers.set(caseId, cuSet);

  const u = users.get(userId);
  memberRoles.set(`${caseId}:${userId}`, {
    userId, name: u?.name || 'Unknown', email: u?.email || '',
    role, addedAt: new Date().toISOString(), addedBy,
  });
  savePersistedCasesData();
}

function removeMember(caseId, userId) {
  const ucSet = userCases.get(userId);
  if (ucSet) ucSet.delete(caseId);
  const cuSet = caseUsers.get(caseId);
  if (cuSet) cuSet.delete(userId);
  memberRoles.delete(`${caseId}:${userId}`);
  savePersistedCasesData();
}

function canAccess(caseId, userId) {
  return (userCases.get(userId) || new Set()).has(caseId);
}

function getMemberRole(caseId, userId) {
  return memberRoles.get(`${caseId}:${userId}`)?.role || null;
}

function listMembers(caseId) {
  const cuSet = caseUsers.get(caseId) || new Set();
  return Array.from(cuSet)
    .map((uid) => memberRoles.get(`${caseId}:${uid}`))
    .filter(Boolean);
}

function isPrivileged(role) {
  return role === 'owner' || role === 'advocate';
}

// Junior + above can see/send internal messages and manage requests
function isLegalTeam(role) {
  return role === 'owner' || role === 'advocate' || role === 'junior';
}

function getUnreadCount(caseId, userId) {
  const lastRead = userLastRead.get(`${caseId}:${userId}`);
  const msgIds = caseMessages.get(caseId) || [];
  if (!lastRead) return msgIds.length;
  return msgIds.filter((id) => {
    const m = messages.get(id);
    return m && m.sentAt > lastRead && m.senderId !== userId;
  }).length;
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.vaultUser = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/vault/health', (req, res) => {
  res.json({ status: 'ok', service: 'LexVault', version: '1.1.0' });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/vault/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, barNumber } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password, role required' });
    if (!['advocate', 'client', 'junior'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (usersByEmail.has(email.toLowerCase())) return res.status(409).json({ error: 'Email already registered' });
    if (password.length < 8) return res.status(400).json({ error: 'Password min 8 characters' });

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const user = {
      id: userId, name, email: email.toLowerCase(), passwordHash, role,
      barNumber: role === 'advocate' ? (barNumber || null) : null,
      enrolledAt: new Date().toISOString(),
    };
    users.set(userId, user);
    usersByEmail.set(email.toLowerCase(), userId);
    savePersistedVaultData();

    const token = jwt.sign({ userId, role, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    return res.status(201).json({
      token,
      user: { id: userId, name, email: email.toLowerCase(), role, barNumber: user.barNumber, enrolledAt: user.enrolledAt },
    });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.post('/vault/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const userId = usersByEmail.get(email.toLowerCase());
    if (!userId) return res.status(401).json({ error: 'Invalid credentials' });
    const user = users.get(userId);
    if (!await bcrypt.compare(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, barNumber: user.barNumber, enrolledAt: user.enrolledAt },
    });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.get('/vault/auth/me', authMiddleware, (req, res) => {
  const user = users.get(req.vaultUser.userId);
  if (!user) return res.status(403).json({ error: 'Access denied' });
  return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, barNumber: user.barNumber, enrolledAt: user.enrolledAt } });
});

// ─── User Search (for adding members) ────────────────────────────────────────

app.get('/vault/users/search', authMiddleware, (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email || email.length < 3) return res.status(400).json({ error: 'Provide at least 3 characters of email' });
  const userId = usersByEmail.get(email);
  if (!userId) return res.json({ user: null });
  const u = users.get(userId);
  if (userId === req.vaultUser.userId) return res.json({ user: null }); // can't add yourself
  return res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

// ─── Cases ────────────────────────────────────────────────────────────────────

app.get('/vault/cases', authMiddleware, (req, res) => {
  const userId = req.vaultUser.userId;
  const caseIds = userCases.get(userId) || new Set();
  const userCaseList = Array.from(caseIds)
    .map((id) => {
      const c = cases.get(id);
      if (!c) return null;
      return {
        ...c,
        myRole: getMemberRole(id, userId),
        memberCount: (caseUsers.get(id) || new Set()).size,
        unreadCount: getUnreadCount(id, userId),
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ cases: userCaseList });
});

app.post('/vault/cases', authMiddleware, (req, res) => {
  const { title, caseNumber, court, caseType, clientName, nextHearing } = req.body;
  if (!title || !caseType || !clientName) return res.status(400).json({ error: 'title, caseType, clientName required' });
  const userId = req.vaultUser.userId;
  const user = users.get(userId);
  const caseId = uuidv4();
  const newCase = {
    id: caseId, title, caseNumber: caseNumber || null, court: court || null,
    caseType, status: 'active', clientName,
    advocateName: req.vaultUser.role === 'advocate' ? (user?.name || null) : null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    nextHearing: nextHearing || null, documentCount: 0, unreadCount: 0,
    createdBy: userId,
  };
  cases.set(caseId, newCase);
  addMember(caseId, userId, 'owner', userId);
  return res.status(201).json({ case: { ...newCase, myRole: 'owner', memberCount: 1 } });
});

app.get('/vault/cases/:caseId', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const c = cases.get(req.params.caseId);
  if (!c) return res.status(403).json({ error: 'Access denied' });
  return res.json({
    case: {
      ...c,
      myRole: getMemberRole(req.params.caseId, userId),
      memberCount: (caseUsers.get(req.params.caseId) || new Set()).size,
      unreadCount: getUnreadCount(req.params.caseId, userId),
    },
  });
});

app.patch('/vault/cases/:caseId', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const role = getMemberRole(req.params.caseId, userId);
  if (!isPrivileged(role)) return res.status(403).json({ error: 'Only advocates can update case details' });
  const c = cases.get(req.params.caseId);
  if (!c) return res.status(403).json({ error: 'Access denied' });
  ['status', 'title', 'court', 'caseNumber', 'nextHearing', 'advocateName'].forEach((k) => {
    if (req.body[k] !== undefined) c[k] = req.body[k];
  });
  c.updatedAt = new Date().toISOString();
  cases.set(c.id, c);
  return res.json({ case: { ...c, myRole: role, memberCount: (caseUsers.get(c.id) || new Set()).size } });
});

// ─── Case Members ─────────────────────────────────────────────────────────────

app.get('/vault/cases/:caseId/members', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  return res.json({ members: listMembers(req.params.caseId) });
});

app.post('/vault/cases/:caseId/members', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const myRole = getMemberRole(req.params.caseId, userId);
  if (!isPrivileged(myRole)) return res.status(403).json({ error: 'Only advocates can add members' });

  const { targetUserId, role } = req.body;
  if (!targetUserId || !role) return res.status(400).json({ error: 'targetUserId and role required' });
  if (!['advocate', 'client', 'junior'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (!users.has(targetUserId)) return res.status(404).json({ error: 'User not found' });
  if (canAccess(req.params.caseId, targetUserId)) return res.status(409).json({ error: 'User already has access' });

  addMember(req.params.caseId, targetUserId, role, userId);
  return res.status(201).json({ member: memberRoles.get(`${req.params.caseId}:${targetUserId}`) });
});

app.delete('/vault/cases/:caseId/members/:targetUserId', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const myRole = getMemberRole(req.params.caseId, userId);
  if (!isPrivileged(myRole)) return res.status(403).json({ error: 'Only advocates can remove members' });
  const targetRole = getMemberRole(req.params.caseId, req.params.targetUserId);
  if (targetRole === 'owner') return res.status(403).json({ error: 'Cannot remove case owner' });
  removeMember(req.params.caseId, req.params.targetUserId);
  return res.json({ success: true });
});

// ─── Documents ───────────────────────────────────────────────────────────────

app.get('/vault/cases/:caseId/documents', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const docIds = caseDocuments.get(req.params.caseId) || [];
  return res.json({ documents: docIds.map((id) => documents.get(id)).filter(Boolean) });
});

app.post('/vault/cases/:caseId/documents', authMiddleware, vaultUpload.single('file'), (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Access denied' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const uploader = users.get(userId);
  const docId = uuidv4();
  const doc = {
    id: docId, caseId: req.params.caseId,
    originalName: req.file.originalname, storedName: req.file.filename,
    filePath: req.file.path, fileSize: req.file.size, mimeType: req.file.mimetype,
    documentType: req.body.documentType || null, description: req.body.description || null,
    uploadedBy: userId, uploaderName: uploader?.name || 'Unknown',
    uploaderRole: req.vaultUser.role, uploadedAt: new Date().toISOString(),
  };
  documents.set(docId, doc);
  const list = caseDocuments.get(req.params.caseId) || [];
  list.unshift(docId);
  caseDocuments.set(req.params.caseId, list);
  const c = cases.get(req.params.caseId);
  if (c) { c.documentCount = list.length; cases.set(c.id, c); }
  const { filePath: _fp, ...safeDoc } = doc;
  return res.status(201).json({ document: safeDoc });
});

app.get('/vault/documents/:docId/file', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }
  const doc = documents.get(req.params.docId);
  if (!doc || !canAccess(doc.caseId, payload.userId)) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(doc.filePath)) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
  res.sendFile(doc.filePath);
});

app.delete('/vault/cases/:caseId/documents/:docId', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const doc = documents.get(req.params.docId);
  if (!doc || doc.caseId !== req.params.caseId) return res.status(403).json({ error: 'Access denied' });
  const myRole = getMemberRole(req.params.caseId, userId);
  if (doc.uploadedBy !== userId && !isPrivileged(myRole)) return res.status(403).json({ error: 'Only the uploader or advocate can delete' });
  try { if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath); } catch { }
  documents.delete(req.params.docId);
  const list = (caseDocuments.get(req.params.caseId) || []).filter((id) => id !== req.params.docId);
  caseDocuments.set(req.params.caseId, list);
  const c = cases.get(req.params.caseId);
  if (c) { c.documentCount = list.length; cases.set(c.id, c); }
  return res.json({ success: true });
});

// ─── Messages ─────────────────────────────────────────────────────────────────

app.get('/vault/cases/:caseId/messages', authMiddleware, (req, res) => {
  const { userId, role } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const myRole = getMemberRole(req.params.caseId, userId);
  const canSeeInternal = isLegalTeam(myRole);
  const msgIds = caseMessages.get(req.params.caseId) || [];
  const msgs = msgIds
    .map((id) => messages.get(id))
    .filter((m) => m && (!m.isInternal || canSeeInternal));
  // Mark as read
  userLastRead.set(`${req.params.caseId}:${userId}`, new Date().toISOString());
  return res.json({ messages: msgs });
});

app.post('/vault/cases/:caseId/messages', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const { body, isInternal } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Message body required' });
  const myRole = getMemberRole(req.params.caseId, userId);
  const sender = users.get(userId);
  const msgId = uuidv4();
  const msg = {
    id: msgId, caseId: req.params.caseId,
    senderId: userId, senderName: sender?.name || 'Unknown', senderRole: req.vaultUser.role,
    body: body.trim(),
    isInternal: isLegalTeam(myRole) ? !!isInternal : false,
    sentAt: new Date().toISOString(),
  };
  messages.set(msgId, msg);
  const list = caseMessages.get(req.params.caseId) || [];
  list.push(msgId);
  caseMessages.set(req.params.caseId, list);
  return res.status(201).json({ message: msg });
});

// ─── Requests ────────────────────────────────────────────────────────────────

app.get('/vault/cases/:caseId/requests', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const myRole = getMemberRole(req.params.caseId, userId);
  const reqIds = caseRequests.get(req.params.caseId) || [];
  let reqs = reqIds.map((id) => requests.get(id)).filter(Boolean);
  // Clients only see their own requests; legal team sees all
  if (!isLegalTeam(myRole)) reqs = reqs.filter((r) => r.requestedBy === userId);
  return res.json({ requests: reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
});

app.post('/vault/cases/:caseId/requests', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const { requestType, title, description, priority } = req.body;
  if (!requestType || !title) return res.status(400).json({ error: 'requestType and title required' });
  const requester = users.get(userId);
  const reqId = uuidv4();
  const newReq = {
    id: reqId, caseId: req.params.caseId,
    requestedBy: userId, requesterName: requester?.name || 'Unknown', requesterRole: req.vaultUser.role,
    requestType, title, description: description || null,
    priority: priority || 'normal', status: 'open',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), resolvedAt: null,
  };
  requests.set(reqId, newReq);
  const list = caseRequests.get(req.params.caseId) || [];
  list.push(reqId);
  caseRequests.set(req.params.caseId, list);
  return res.status(201).json({ request: newReq });
});

app.patch('/vault/cases/:caseId/requests/:reqId', authMiddleware, (req, res) => {
  const { userId } = req.vaultUser;
  if (!canAccess(req.params.caseId, userId)) return res.status(403).json({ error: 'Access denied' });
  const r = requests.get(req.params.reqId);
  if (!r || r.caseId !== req.params.caseId) return res.status(403).json({ error: 'Access denied' });
  const myRole = getMemberRole(req.params.caseId, userId);
  // Legal team can update any request; client can only close their own
  if (!isLegalTeam(myRole) && r.requestedBy !== userId) return res.status(403).json({ error: 'Access denied' });
  if (req.body.status) {
    r.status = req.body.status;
    if (['resolved', 'closed'].includes(req.body.status)) r.resolvedAt = new Date().toISOString();
  }
  r.updatedAt = new Date().toISOString();
  requests.set(r.id, r);
  return res.json({ request: r });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nLexVault Server  →  http://0.0.0.0:${PORT}`);
  console.log(`Health check     →  http://localhost:${PORT}/vault/health\n`);
});
