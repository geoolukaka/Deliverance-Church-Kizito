const jwt = require('jsonwebtoken');

const bearer = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};
const verify = (token) => jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); // pin the algorithm

function verifyToken(req, res, next) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ message: 'Authentication required. Please log in.' });
  try { req.user = verify(token); next(); }
  catch (err) { return res.status(401).json({ message: 'Your session has expired. Please log in again.' }); }
}

/** Attaches req.user if a valid token is sent, otherwise continues as a guest (e.g. guest giving). */
function optionalAuth(req, res, next) {
  const token = bearer(req);
  if (token) { try { req.user = verify(token); } catch (e) { /* treat as guest */ } }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { verifyToken, optionalAuth, requireRole };
