const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { verifyToken, optionalAuth, requireRole } = require('../middleware/auth');
const { requireCaptcha } = require('../middleware/captcha');
const mpesa = require('../services/mpesa');
const sheets = require('../services/googleSheets');

const router = express.Router();

const FUND_LABELS = {
  tithe: 'Tithe', offering: 'Offering', building: 'Building Fund',
  missions: 'Missions', welfare: 'Welfare', other: 'Other',
};
const MAX_KES = 250000; // M-Pesa per-transaction limit

const limiter = (windowMs, max, message) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { message } });
const pushLimiter = limiter(10 * 60 * 1000, 6, 'Too many payment requests. Please wait a few minutes and try again.');
const statusLimiter = limiter(60 * 1000, 60, 'Too many requests. Please slow down.');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const maskPhone = (p) => String(p || '').replace(/^(\d{5})\d+(\d{3})$/, '$1***$2'); // keep phone numbers out of logs

/** Apply a final result (from Safaricom's callback OR from our own status query) exactly once. */
async function finalize(donation, r) {
  const d = mpesa.describeResult(r.resultCode);
  let status = r.success ? 'completed' : d.status;
  let message = d.message;
  if (r.success && r.amount != null && Number(r.amount) !== Number(donation.amount)) {
    status = 'failed'; message = 'The amount did not match. Please contact the church office with your M-Pesa message.';
    console.error('[mpesa] amount mismatch for donation', donation.id);
  }
  const [u] = await pool.query(
    `UPDATE donations SET status = ?, status_message = ?, mpesa_receipt_number = COALESCE(?, mpesa_receipt_number)
     WHERE id = ? AND status = 'pending'`,                       // only pending rows can change -> replay-proof
    [status, message, r.receipt || null, donation.id]
  );
  if (u.affectedRows && status === 'completed') {
    sheets.logDonation({
      donorName: donation.donor_name, donorEmail: donation.donor_email, donorPhone: donation.donor_phone,
      fund: donation.fund, amount: donation.amount, paymentMethod: 'mpesa', status: 'completed',
      mpesaReceiptNumber: r.receipt || '',
    });
  }
  return { status, message };
}

// POST /api/donations/mpesa/stkpush — guests and members
router.post(
  '/mpesa/stkpush',
  pushLimiter,
  optionalAuth,
  requireCaptcha,
  [
    body('amount').isFloat({ min: 1, max: MAX_KES }).withMessage(`Enter an amount between 1 and ${MAX_KES} KES`),
    body('fund').isIn(Object.keys(FUND_LABELS)).withMessage('Select a valid fund'),
    body('donorName').trim().isLength({ max: 150 }).bail().notEmpty().withMessage('Name is required'),
    body('donorEmail').isEmail().isLength({ max: 150 }).withMessage('A valid email is required'),
    body('phone').matches(/^254(7|1)\d{8}$/).withMessage('Enter a valid Kenyan phone number, e.g. 2547XXXXXXXX'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { fund, donorName, donorEmail, phone } = req.body;
    const amount = Math.round(Number(req.body.amount));
    const memberId = req.user ? req.user.id : null;

    try {
      // Protect people from "prompt spam": max 3 prompts to one phone number per 10 minutes.
      const [[recent]] = await pool.query(
        `SELECT COUNT(*) AS n FROM donations WHERE donor_phone = ? AND created_at > (NOW() - INTERVAL 10 MINUTE)`, [phone]);
      if (recent.n >= 3) {
        return res.status(429).json({ message: 'Several payment requests were already sent to this number. Please wait a few minutes.' });
      }

      const [ins] = await pool.query(
        `INSERT INTO donations (member_id, donor_name, donor_email, donor_phone, fund, amount, currency, payment_method, status)
         VALUES (?, ?, ?, ?, ?, ?, 'KES', 'mpesa', 'pending')`,
        [memberId, donorName, donorEmail, phone, fund, amount]);
      const donationId = ins.insertId;

      let stk;
      try {
        stk = await mpesa.stkPush({ phone, amount, accountReference: `DCIKizito-${FUND_LABELS[fund]}`, transactionDesc: FUND_LABELS[fund] });
      } catch (err) {
        await pool.query(`UPDATE donations SET status = 'failed', status_message = 'Could not reach M-Pesa' WHERE id = ?`, [donationId]);
        console.error('[mpesa/stkpush]', maskPhone(phone), err.response ? err.response.data : err.message);
        return res.status(502).json({ message: 'We could not reach M-Pesa right now. Please try again shortly.' });
      }

      await pool.query(
        `UPDATE donations SET mpesa_merchant_request_id = ?, mpesa_checkout_request_id = ? WHERE id = ?`,
        [stk.MerchantRequestID, stk.CheckoutRequestID, donationId]);

      res.json({ message: 'M-Pesa prompt sent. Enter your PIN on your phone to approve.', checkoutRequestId: stk.CheckoutRequestID });
    } catch (err) {
      console.error('[donations/mpesa/stkpush]', err.message);
      res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
  }
);

// POST /api/donations/mpesa/callback/:secret — called by Safaricom only.
// The secret in the URL (MPESA_CALLBACK_SECRET) means random internet traffic cannot fake a payment.
router.post('/mpesa/callback/:secret', async (req, res) => {
  const expected = process.env.MPESA_CALLBACK_SECRET || '';
  if (expected.length < 16 || !safeEqual(req.params.secret, expected)) {
    return res.status(404).json({ message: 'Not found.' }); // look like nothing is here
  }
  try {
    const r = mpesa.parseCallback(req.body);
    if (r) {
      const [rows] = await pool.query('SELECT * FROM donations WHERE mpesa_checkout_request_id = ?', [r.checkoutRequestId]);
      if (rows.length) {
        await finalize(rows[0], { success: r.success, resultCode: r.resultCode, receipt: r.mpesaReceiptNumber, amount: r.amount });
      }
    }
  } catch (err) {
    console.error('[donations/mpesa/callback]', err.message);
  }
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' }); // always acknowledge so Safaricom does not retry-storm
});

// GET /api/donations/mpesa/status/:id — the browser polls this while the donor is at their phone.
const lastQuery = new Map();
router.get('/mpesa/status/:id', statusLimiter, async (req, res) => {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid reference.' });
  try {
    const [rows] = await pool.query(
      `SELECT id, donor_name, donor_email, donor_phone, fund, amount, status, status_message, mpesa_receipt_number,
              TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age
       FROM donations WHERE mpesa_checkout_request_id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Payment not found.' });
    const d = rows[0];
    let out = { status: d.status, message: d.status_message };

    // Callback slow or lost? After 15s, ask Safaricom directly (at most every 8s per payment).
    if (d.status === 'pending' && d.age >= 15 && Date.now() - (lastQuery.get(req.params.id) || 0) > 8000) {
      lastQuery.set(req.params.id, Date.now());
      for (const [k, t] of lastQuery) if (Date.now() - t > 600000) lastQuery.delete(k);
      try {
        const q = await mpesa.stkQuery(req.params.id);
        if (!q.pending) out = await finalize(d, q);
      } catch (e) { /* still pending; try again next poll */ }
    }
    const [[fresh]] = await pool.query('SELECT mpesa_receipt_number AS r FROM donations WHERE id = ?', [d.id]);
    res.json({ status: out.status, message: out.message || null, receipt: out.status === 'completed' ? (fresh && fresh.r) : null });
  } catch (err) {
    console.error('[donations/mpesa/status]', err.message);
    res.status(500).json({ message: 'Could not check status.' });
  }
});

// POST /api/donations/card/initiate — placeholder for a card processor (Paystack/Flutterwave/Pesapal)
router.post('/card/initiate', async (req, res) => {
  res.status(501).json({
    message: 'Card payments are not yet configured on this server. Please use M-Pesa, or set CARD_PROVIDER in .env and implement services/cardProvider.js.',
  });
});

// GET /api/donations/my-history — logged-in member's own giving history (KES)
router.get('/my-history', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, fund, amount, currency, payment_method, status, created_at
       FROM donations WHERE member_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 100`, [req.user.id]);
    res.json({ donations: rows });
  } catch (err) {
    console.error('[donations/my-history]', err.message);
    res.status(500).json({ message: 'Could not load giving history.' });
  }
});

// GET /api/donations — admin/pastor list of all donations
router.get('/', verifyToken, requireRole('admin', 'pastor'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, donor_name, donor_email, fund, amount, currency, payment_method, status, created_at
       FROM donations ORDER BY created_at DESC LIMIT 500`);
    res.json({ donations: rows });
  } catch (err) {
    console.error('[donations/list]', err.message);
    res.status(500).json({ message: 'Could not load donations.' });
  }
});

module.exports = router;
