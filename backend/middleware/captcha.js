/**
 * Self-hosted "I'm not a robot" check (proof-of-work, ALTCHA-style).
 *
 *  1. GET /api/captcha/challenge  -> server signs a puzzle (HMAC with CAPTCHA_SECRET)
 *  2. The browser solves it (finds the number whose SHA-256 matches) when the donor ticks the box
 *  3. The solved token is sent with the form as `captcha`
 *  4. requireCaptcha verifies signature + expiry + solution, and each token works ONCE (replay-proof)
 *
 * requireCaptcha runs BEFORE the M-Pesa STK push is triggered, so bots cannot spam
 * payment prompts to people's phones.
 */
const crypto = require('crypto');

const MAX_NUMBER = 50000;           // puzzle difficulty (client brute-forces 0..MAX_NUMBER)
const TTL_MS = 5 * 60 * 1000;       // a challenge is valid for 5 minutes

// In development a random secret is fine; production is forced to set CAPTCHA_SECRET (see server.js).
const DEV_SECRET = crypto.randomBytes(32).toString('hex');
const secret = () => process.env.CAPTCHA_SECRET || DEV_SECRET;

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const sign = (challenge) => crypto.createHmac('sha256', secret()).update(challenge).digest('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const used = new Map(); // challenge -> expiry (single-use tokens)
function prune() { const now = Date.now(); for (const [k, exp] of used) if (exp < now) used.delete(k); }

function createChallenge(req, res) {
  const salt = `${crypto.randomBytes(12).toString('hex')}?expires=${Date.now() + TTL_MS}`;
  const number = crypto.randomInt(0, MAX_NUMBER + 1);
  const challenge = sha256(salt + number);
  res.json({ algorithm: 'SHA-256', challenge, salt, maxnumber: MAX_NUMBER, signature: sign(challenge) });
}

function requireCaptcha(req, res, next) {
  const fail = (msg) => res.status(400).json({ message: msg || 'Please tick “I’m not a robot” and try again.' });
  try {
    const raw = req.body && req.body.captcha;
    if (!raw || typeof raw !== 'string' || raw.length > 2000) return fail();

    const t = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    if (!t || t.algorithm !== 'SHA-256' || typeof t.salt !== 'string' || typeof t.challenge !== 'string'
      || typeof t.signature !== 'string' || !Number.isInteger(t.number) || t.number < 0 || t.number > MAX_NUMBER) return fail();

    if (!safeEqual(t.signature, sign(t.challenge))) return fail();               // we issued this puzzle
    const m = /[?&]expires=(\d+)/.exec(t.salt);
    if (!m || Number(m[1]) < Date.now()) return fail('The security check expired. Please tick the box again.');
    if (!safeEqual(sha256(t.salt + t.number), t.challenge)) return fail();       // solved correctly

    prune();
    if (used.has(t.challenge)) return fail('That security check was already used. Please tick the box again.');
    used.set(t.challenge, Number(m[1]));

    delete req.body.captcha;
    next();
  } catch (e) {
    return fail();
  }
}

module.exports = { createChallenge, requireCaptcha };
