const express = require('express');
const { pool } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const day = (d) => (d ? String(d).slice(0, 10) : '');

// GET /api/members/me/dashboard — the logged-in member's portal data
router.get('/me/dashboard', verifyToken, async (req, res) => {
  try {
    const id = req.user.id;
    const [[ytd]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM donations
       WHERE member_id = ? AND status = 'completed' AND YEAR(created_at) = YEAR(CURDATE())`, [id]);
    const [groups] = await pool.query(
      `SELECT g.name, g.meeting_day, g.meeting_time FROM group_members gm
       JOIN \`groups\` g ON g.id = gm.group_id WHERE gm.member_id = ?`, [id]);
    const [events] = await pool.query(
      `SELECT e.title, e.location, e.event_date, e.start_time, ea.role FROM event_attendees ea
       JOIN events e ON e.id = ea.event_id WHERE ea.member_id = ? AND e.event_date >= CURDATE()
       ORDER BY e.event_date LIMIT 20`, [id]);
    const [giving] = await pool.query(
      `SELECT fund, amount, payment_method, created_at FROM donations
       WHERE member_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 20`, [id]);

    res.json({
      yearToDateGiving: Number(ytd.total),
      groups: groups.map((g) => ({ name: g.name, schedule: [g.meeting_day, g.meeting_time].filter(Boolean).join(' · ') })),
      upcomingEvents: events.map((e) => ({ date: day(e.event_date), time: e.start_time ? String(e.start_time).slice(0, 5) : '', title: e.title, location: e.location, role: e.role })),
      givingHistory: giving.map((d) => ({ date: day(d.created_at), fund: d.fund, method: d.payment_method === 'mpesa' ? 'M-Pesa' : d.payment_method, amount: Number(d.amount) })),
    });
  } catch (err) { console.error('[members/dashboard]', err.message); res.status(500).json({ message: 'Could not load your dashboard.' }); }
});

module.exports = router;
