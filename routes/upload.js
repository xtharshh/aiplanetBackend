import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import Document from '../models/document.js';
import axios from 'axios';

const router = express.Router();

// Setup directories for uploads and extracted text
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');
const extractedDir = path.join(__dirname, '../extracted');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(extractedDir, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// POST /upload - handle PDF upload
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only PDF files are supported.' });
    }
    const pdfPath = req.file.path;
    let dataBuffer;
    try {
      dataBuffer = fs.readFileSync(pdfPath);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read uploaded PDF file.', details: err.message });
    }
    let data;
    try {
      data = await pdfParse(dataBuffer);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to extract text from PDF.', details: err.message });
    }
    const textFilename = req.file.originalname + '.txt';
    const absoluteTextPath = path.join(extractedDir, textFilename); // Absolute path for saving
    const relativeTextPath = path.join('extracted', textFilename); // Relative path for DB
    try {
      fs.writeFileSync(absoluteTextPath, data.text, 'utf-8');
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save extracted text.', details: err.message });
    }
    let doc;
    try {
      doc = await Document.create({
        filename: req.file.originalname,
        textPath: relativeTextPath, // Store only relative path
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save document metadata.', details: err.message });
    }
    let geminiResponse = null;
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
      const geminiPayload = {
        contents: [
          {
            parts: [
              { text: `Summarize the following PDF content:\n${data.text.slice(0, 12000)}` }
            ]
          }
        ]
      };
      const geminiRes = await axios.post(geminiApiUrl, geminiPayload, {
        headers: { 'Content-Type': 'application/json' }
      });
      geminiResponse = geminiRes.data;
    } catch (err) {
      console.error('Gemini API error:', err.response ? err.response.data : err.message);
      geminiResponse = { error: 'Failed to get response from Gemini API', details: err.message, response: err.response ? err.response.data : undefined };
    }
    res.json({
      id: doc.id,
      filename: doc.filename,
      uploadDate: doc.uploadDate,
      gemini: geminiResponse
    });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected server error.', details: err.message });
  }
});

export default router; 