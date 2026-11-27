const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { requireCaptcha } = require('../middleware/captcha');
const sheets = require('../services/googleSheets');

const router = express.Router();

// POST /api/contact — public
router.post(
  '/',
  requireCaptcha,
  [
    body('name').trim().isLength({ max: 150 }).bail().notEmpty().withMessage('Name is required'),
    body('email').isEmail().isLength({ max: 150 }).withMessage('A valid email is required'),
    body('subject').trim().isLength({ max: 200 }).bail().notEmpty().withMessage('Subject is required'),
    body('message').trim().isLength({ max: 3000 }).bail().notEmpty().withMessage('Message is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { name, email, phone, subject, message } = req.body;

    try {
      await pool.query(
        `INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)`,
        [name, email, phone || null, subject, message]
      );
      sheets.logContactMessage({ name, email, phone, subject, message });
      res.status(201).json({ message: 'Message received. Thank you for reaching out!' });
    } catch (err) {
      console.error('[contact/create]', err);
      res.status(500).json({ message: 'Could not send your message. Please try again.' });
    }
  }
);

// GET /api/contact — admin/pastor view of submissions
router.get('/', verifyToken, requireRole('admin', 'pastor'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200'
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error('[contact/list]', err);
    res.status(500).json({ message: 'Could not load messages.' });
  }
});

module.exports = router;
