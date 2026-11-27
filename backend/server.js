require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const { testConnection } = require('./config/db');

const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const contactRoutes = require('./routes/contact');
const eventRoutes = require('./routes/events');
const sermonRoutes = require('./routes/sermons');
const memberRoutes = require('./routes/members');
const postRoutes = require('./routes/posts');
const groupRoutes = require('./routes/groups');
const { createChallenge } = require('./middleware/captcha');

// ---- Startup safety checks: refuse to run insecurely in production ----
if (process.env.NODE_ENV === 'production') {
  const problems = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) problems.push('JWT_SECRET must be at least 32 random characters');
  if (!process.env.CAPTCHA_SECRET || process.env.CAPTCHA_SECRET.length < 16) problems.push('CAPTCHA_SECRET must be set (16+ characters)');
  if (!process.env.MPESA_CALLBACK_SECRET || process.env.MPESA_CALLBACK_SECRET.length < 16) problems.push('MPESA_CALLBACK_SECRET must be set (16+ characters)');
  if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.includes('*')) problems.push('CORS_ORIGIN must be your exact website address, not *');
  if (problems.length) { console.error('[startup] Refusing to start:\n - ' + problems.join('\n - ')); process.exit(1); }
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Render/Railway proxies

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim());

app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  credentials: false,               // we use Authorization headers, not cookies
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}));

app.use(express.json({ limit: '50kb' }));
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }); // never cache personal data

// Rate limiting: general API + stricter for login/register/captcha (brute-force protection)
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
const strict = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' } });
app.use('/api/auth', strict);
app.use('/api/contact', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many messages sent. Please try again later.' } }));
app.use('/api/captcha', strict);
app.get('/api/captcha/challenge', createChallenge);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'DCI Kizito API', currency: 'KES', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/sermons', sermonRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/groups', groupRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`[server] DCI Kizito API listening on port ${PORT}`);
  await testConnection();
});
