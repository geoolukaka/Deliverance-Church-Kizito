const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { requireCaptcha } = require('../middleware/captcha');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

function signToken(member) {
  return jwt.sign(
    { id: member.id, email: member.email, role: member.role, groupSlug: member.group_slug || null },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function toPublicMember(m) {
  return {
    id: m.id,
    firstName: m.first_name,
    lastName: m.last_name,
    email: m.email,
    phone: m.phone,
    role: m.role,
    groupSlug: m.group_slug || null,
  };
}

// POST /api/auth/register
router.post(
  '/register',
  requireCaptcha,
  [
    body('firstName').trim().isLength({ max: 80 }).bail().notEmpty().withMessage('First name is required'),
    body('lastName').trim().isLength({ max: 80 }).bail().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().isLength({ max: 150 }).normalizeEmail().withMessage('A valid email is required'),
    body('phone').trim().isLength({ max: 20 }).bail().notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be 8–72 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { firstName, lastName, email, phone, password } = req.body;

    try {
      const [existing] = await pool.query('SELECT id FROM members WHERE email = ?', [email]);
      if (existing.length) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const [result] = await pool.query(
        `INSERT INTO members (first_name, last_name, email, phone, password_hash, role)
         VALUES (?, ?, ?, ?, ?, 'member')`,
        [firstName, lastName, email, phone, passwordHash]
      );

      const member = {
        id: result.insertId, first_name: firstName, last_name: lastName,
        email, phone, role: 'member',
      };
      const token = signToken(member);
      res.status(201).json({ token, member: toPublicMember(member) });
    } catch (err) {
      console.error('[auth/register]', err);
      res.status(500).json({ message: 'Could not create account. Please try again.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  requireCaptcha,
  [
    body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
    body('password').notEmpty().isLength({ max: 72 }).withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { email, password } = req.body;

    try {
      const [rows] = await pool.query('SELECT * FROM members WHERE email = ? AND is_active = 1', [email]);
      const DUMMY = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO5Q5ZQ1j0m0r0m0r0m0r0m0r0m0r0m0e'; // equalises timing when the email is unknown
      if (!rows.length) {
        await bcrypt.compare(password, DUMMY).catch(() => false);
        return res.status(401).json({ message: 'Invalid email or password.' });
      }
      const member = rows[0];
      const match = await bcrypt.compare(password, member.password_hash);
      if (!match) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }
      const token = signToken(member);
      res.json({ token, member: toPublicMember(member) });
    } catch (err) {
      console.error('[auth/login]', err);
      res.status(500).json({ message: 'Could not log in right now. Please try again.' });
    }
  }
);

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Member not found.' });
    res.json({ member: toPublicMember(rows[0]) });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ message: 'Could not load profile.' });
  }
});

module.exports = router;
