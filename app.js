import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import uploadRouter from './routes/upload.js';
import documentsRouter from './routes/documents.js';
import askRouter from './routes/ask.js';
import sequelize from './db.js';

dotenv.config();

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// For file uploads and static serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/extracted', express.static(path.join(__dirname, 'extracted')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/upload', uploadRouter);
app.use('/documents', documentsRouter);
app.use('/ask', askRouter);

// Sync DB
sequelize.sync().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 