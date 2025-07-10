import express from 'express';
import Document from '../models/document.js';

const router = express.Router();

// GET /documents - list all uploaded documents
router.get('/', async (req, res) => {
  try {
    const docs = await Document.findAll({
      attributes: ['id', 'filename', 'uploadDate']
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents.', details: err.message });
  }
});

export default router; 