const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const SLUG = /^[a-z0-9-]{1,40}$/;

function validSlug(req, res, next) {
  if (!SLUG.test(req.params.slug)) return res.status(400).json({ message: 'Invalid group.' });
  next();
}
/** Admins & pastors manage every group; a leader manages only their own group page. */
function canManage(req, res, next) {
  const u = req.user || {};
  if (u.role === 'admin' || u.role === 'pastor' || (u.role === 'leader' && u.groupSlug === req.params.slug)) return next();
  return res.status(403).json({ message: 'You do not have permission to update this group.' });
}

// GET /api/groups/:slug — public events + updates for a group page
router.get('/:slug', validSlug, async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT id, title, event_date AS date, start_time AS time, location, description
       FROM group_events WHERE group_slug = ? AND event_date >= CURDATE() ORDER BY event_date LIMIT 100`, [req.params.slug]);
    const [posts] = await pool.query(
      `SELECT id, title, body, created_at FROM group_posts WHERE group_slug = ? ORDER BY created_at DESC LIMIT 50`, [req.params.slug]);
    res.json({ events, posts });
  } catch (err) { console.error('[groups/get]', err.message); res.status(500).json({ message: 'Could not load this group.' }); }
});

router.post('/:slug/events', validSlug, verifyToken, canManage, [
  body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Title is required'),
  body('event_date').isISO8601().withMessage('A valid date is required'),
  body('location').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 3000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const { title, event_date, start_time, location, description } = req.body;
  try {
    const [r] = await pool.query(
      `INSERT INTO group_events (group_slug, title, event_date, start_time, location, description) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.slug, title, event_date, start_time || null, location || null, description || null]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { console.error('[groups/event]', err.message); res.status(500).json({ message: 'Could not save the event.' }); }
});

router.post('/:slug/posts', validSlug, verifyToken, canManage, [
  body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Title is required'),
  body('body').trim().notEmpty().isLength({ max: 5000 }).withMessage('Message is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  try {
    const [r] = await pool.query(
      `INSERT INTO group_posts (group_slug, title, body, author_id) VALUES (?, ?, ?, ?)`,
      [req.params.slug, req.body.title, req.body.body, req.user.id]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { console.error('[groups/post]', err.message); res.status(500).json({ message: 'Could not save the update.' }); }
});

router.delete('/:slug/:kind(events|posts)/:id(\\d+)', validSlug, verifyToken, canManage, async (req, res) => {
  const table = req.params.kind === 'events' ? 'group_events' : 'group_posts';
  try {
    await pool.query(`DELETE FROM ${table} WHERE id = ? AND group_slug = ?`, [req.params.id, req.params.slug]);
    res.json({ message: 'Deleted.' });
  } catch (err) { console.error('[groups/delete]', err.message); res.status(500).json({ message: 'Could not delete.' }); }
});

module.exports = router;
