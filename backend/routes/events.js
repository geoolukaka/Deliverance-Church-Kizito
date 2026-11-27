const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/events — upcoming church events (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, description, location, event_date, start_time, end_time
       FROM events WHERE event_date >= CURDATE() ORDER BY event_date, start_time LIMIT 100`);
    res.json({ events: rows });
  } catch (err) { console.error('[events/list]', err.message); res.status(500).json({ message: 'Could not load events.' }); }
});

// POST /api/events — admin/pastor
router.post('/', verifyToken, requireRole('admin', 'pastor'), [
  body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Title is required'),
  body('eventDate').isISO8601().withMessage('A valid date is required'),
  body('location').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 3000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const { title, description, location, eventDate, startTime, endTime } = req.body;
  try {
    const [r] = await pool.query(
      `INSERT INTO events (title, description, location, event_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description || null, location || null, eventDate, startTime || null, endTime || null]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { console.error('[events/create]', err.message); res.status(500).json({ message: 'Could not save the event.' }); }
});

router.delete('/:id(\\d+)', verifyToken, requireRole('admin', 'pastor'), async (req, res) => {
  try { await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]); res.json({ message: 'Deleted.' }); }
  catch (err) { console.error('[events/delete]', err.message); res.status(500).json({ message: 'Could not delete.' }); }
});

module.exports = router;
