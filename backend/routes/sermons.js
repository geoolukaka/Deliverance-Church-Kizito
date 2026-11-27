const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router = express.Router();

const url = (name, label) => body(name).optional({ values: 'falsy' })
  .isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage(`${label} link must be a full http(s) URL`);

// GET /api/sermons — latest sermons (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, speaker, sermon_date, scripture_reference, video_url, audio_url, notes_url, description
       FROM sermons ORDER BY sermon_date DESC LIMIT 100`);
    res.json({ sermons: rows });
  } catch (err) { console.error('[sermons/list]', err.message); res.status(500).json({ message: 'Could not load sermons.' }); }
});

// POST /api/sermons — admin/pastor
router.post('/', verifyToken, requireRole('admin', 'pastor'), [
  body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Title is required'),
  body('speaker').trim().notEmpty().isLength({ max: 150 }).withMessage('Speaker is required'),
  body('sermonDate').isISO8601().withMessage('A valid date is required'),
  url('videoUrl', 'Video'), url('audioUrl', 'Audio'), url('notesUrl', 'Notes'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const { title, speaker, sermonDate, scriptureReference, videoUrl, audioUrl, notesUrl, description } = req.body;
  try {
    const [r] = await pool.query(
      `INSERT INTO sermons (title, speaker, sermon_date, scripture_reference, video_url, audio_url, notes_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, speaker, sermonDate, scriptureReference || null, videoUrl || null, audioUrl || null, notesUrl || null, description || null]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { console.error('[sermons/create]', err.message); res.status(500).json({ message: 'Could not save the sermon.' }); }
});

module.exports = router;
