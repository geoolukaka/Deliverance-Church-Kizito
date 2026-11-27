const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router = express.Router();

const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'post';

// GET /api/posts — published newsletters & articles (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, slug, excerpt, body, author, cover_url, published_at AS date
       FROM posts WHERE is_published = 1 ORDER BY published_at DESC LIMIT 100`);
    res.json({ posts: rows });
  } catch (err) { console.error('[posts/list]', err.message); res.status(500).json({ message: 'Could not load posts.' }); }
});

// POST /api/posts — admin/pastor
router.post('/', verifyToken, requireRole('admin', 'pastor'), [
  body('type').isIn(['newsletter', 'article']).withMessage('Choose newsletter or article'),
  body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Title is required'),
  body('excerpt').optional({ values: 'falsy' }).trim().isLength({ max: 400 }),
  body('body').trim().notEmpty().isLength({ max: 50000 }).withMessage('Content is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const { type, title, excerpt, body: text } = req.body;
  try {
    const slug = `${slugify(title)}-${crypto.randomBytes(3).toString('hex')}`;
    const [r] = await pool.query(
      `INSERT INTO posts (type, title, slug, excerpt, body) VALUES (?, ?, ?, ?, ?)`,
      [type, title, slug, excerpt || null, text]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { console.error('[posts/create]', err.message); res.status(500).json({ message: 'Could not publish.' }); }
});

module.exports = router;
