import express from 'express';
import Document from '../models/document.js';
import fs from 'fs';
import axios from 'axios';

const router = express.Router();

// POST /ask - answer questions about a PDF document
router.post('/', async (req, res) => {
  try {
    const { document_id, question } = req.body;
    if (!document_id || !question) {
      return res.status(400).json({ error: 'document_id and question are required.' });
    }
    const doc = await Document.findByPk(document_id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    let text;
    try {
      text = fs.readFileSync(doc.textPath, 'utf-8');
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read extracted text file.', details: err.message });
    }
    // Call Google Gemini API
    try {
      const geminiRes = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GOOGLE_API_KEY,
        {
          contents: [
            { role: 'user', parts: [{ text: `Document Content: ${text}\n\nQuestion: ${question}` }] }
          ]
        }
      );
      const answer = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer generated.';
      res.json({ answer });
    } catch (err) {
      res.status(500).json({ error: 'Error querying Gemini API', details: err.message });
    }
  } catch (err) {
    res.status(500).json({ error: 'Unexpected server error.', details: err.message });
  }
});

export default router; 