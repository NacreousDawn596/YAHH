const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await pool.execute(
      'SELECT id, name, email, avatar, title, department, is_admin, status FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid token or user not found.' });
    }
    
    req.user = users[0];
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Server error during admin check.' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const [users] = await pool.execute(
        'SELECT id, name, email, avatar, title, department, is_admin, status FROM users WHERE id = ? AND is_active = TRUE',
        [decoded.userId]
      );
      
      if (users.length > 0) {
        req.user = users[0];
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = { authenticate, requireAdmin, optionalAuth };