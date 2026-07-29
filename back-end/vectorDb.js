const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, 'storage');
const DB_FILE = path.join(STORAGE_DIR, 'vector_store.json');

class VectorDatabase {
  constructor() {
    this.store = new Map(); // documentId -> Array<ChunkWithEmbedding>
    this.isInitialized = false;
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([docId, chunks]) => {
            if (Array.isArray(chunks)) {
              this.store.set(docId, chunks);
            }
          });
        }
        console.log(`[VectorDB] Loaded vector index for ${this.store.size} document(s) from ${DB_FILE}`);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('[VectorDB] Init error:', err.message);
    }
    this.isInitialized = true;
  }

  save() {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      const obj = {};
      this.store.forEach((chunks, docId) => {
        obj[docId] = chunks;
      });
      fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('[VectorDB] Save error:', err.message);
    }
  }

  upsertChunks(documentId, chunks) {
    if (!documentId || !Array.isArray(chunks)) return;
    this.store.set(documentId, chunks);
    this.save();
    console.log(`[VectorDB] Indexed ${chunks.length} chunk vectors for document ${documentId}`);
  }

  getChunks(documentId) {
    return this.store.get(documentId) || [];
  }

  deleteDocument(documentId) {
    if (this.store.has(documentId)) {
      this.store.delete(documentId);
      this.save();
    }
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  keywordScore(query, text) {
    const terms = query.toLowerCase().match(/\w+/g) || [];
    if (terms.length === 0) return 0;
    const lowerText = text.toLowerCase();
    let matches = 0;
    for (const term of terms) {
      if (term.length > 2 && lowerText.includes(term)) matches++;
    }
    return matches / terms.length;
  }

  querySimilarity(documentId, queryEmbedding, queryText = '', topK = 4) {
    const chunks = this.getChunks(documentId);
    if (chunks.length === 0) return [];
    if (chunks.length <= topK) return chunks;

    const scored = chunks.map((chunk) => {
      let simScore = 0;
      if (queryEmbedding && chunk.embedding) {
        simScore = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      }
      const kwScore = queryText ? this.keywordScore(queryText, chunk.text) : 0;
      const finalScore = (queryEmbedding && chunk.embedding)
        ? (simScore * 0.7 + kwScore * 0.3)
        : kwScore;

      return { ...chunk, score: finalScore };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}

const vectorDb = new VectorDatabase();
module.exports = vectorDb;
