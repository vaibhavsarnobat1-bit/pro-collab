const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pro_collab_super_secret_jwt_key_2026';

const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin permissions required' });
  }
};

// Attaches req.user when a valid token is present but never rejects the request,
// for routes that behave better with an identity and still work without one.
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    } catch {
      /* an invalid token is simply treated as anonymous here */
    }
  }
  next();
};

// Verify a raw JWT string the same way protect() does, for socket handshakes.
const verifyToken = (token) => {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

module.exports = { protect, adminOnly, optionalAuth, verifyToken, JWT_SECRET };
