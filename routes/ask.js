import express from 'express';
import Document from '../models/document.js';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

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
      // Resolve relative path to absolute path
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const fullTextPath = path.join(__dirname, '..', doc.textPath);
      text = fs.readFileSync(fullTextPath, 'utf-8');
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read extracted text file.', details: err.message });
    }
    // Call Google Gemini API
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      const geminiRes = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + geminiApiKey,
        {
          contents: [
            {
              parts: [
                { text: `You are an expert assistant. When answering, use a bolded header (e.g., **React:**) on one line, then start the explanation on the next line. Use Markdown bold for the header, then a line break, then the answer. Use both the information from the resume below and your own general knowledge to answer the user's question as helpfully as possible. Format your answer in clear bullet points or short paragraphs as appropriate.\n\nResume Content:\n${text}\n\nQuestion: ${question}` }
              ]
            }
          ]
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const answer = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer generated.';
      res.json({ answer });
    } catch (err) {
      console.error('Gemini API error:', err.response ? err.response.data : err.message);
      res.status(500).json({ error: 'Error querying Gemini API', details: err.message, response: err.response ? err.response.data : undefined });
    }
  } catch (err) {
    res.status(500).json({ error: 'Unexpected server error.', details: err.message });
  }
});

export default router; 