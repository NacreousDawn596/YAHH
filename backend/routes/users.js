const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const router = express.Router();
const multer = require('multer');
const upload = multer();

router.get('/', authenticate, async (req, res) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT id, name, email, avatar, title, department, status, created_at
      FROM users 
      WHERE is_active = TRUE
    `;
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ? OR title LIKE ? OR department LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [users] = await pool.execute(query, params);

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const isOwnProfile = req.user && req.user.id === parseInt(userId);

    const [users] = await pool.execute(
      `SELECT id, name, email, avatar, title, department, bio, status, created_at
       FROM users WHERE id = ? AND is_active = TRUE`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    const [postCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = ?',
      [userId]
    );

    const [spaceCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM user_spaces WHERE user_id = ?',
      [userId]
    );

    let isFollowing = false;
    if (req.user && req.user.id !== parseInt(userId)) {
      const [followCheck] = await pool.execute(
        'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
        [req.user.id, userId]
      );
      isFollowing = followCheck.length > 0;
    }

    res.json({
      user: {
        ...user,
        postCount: postCount[0].count,
        spaceCount: spaceCount[0].count,
        isFollowing,
        isOwnProfile  // Added field to indicate if current user owns the profile
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
});

router.get('/:id/posts', optionalAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const { limit = 20, offset = 0 } = req.query;

    const [userCheck] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );

    if (userCheck.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [posts] = await pool.execute(
      `SELECT 
    p.*,
    u.name AS user_name,
    u.avatar AS user_avatar,
    u.title AS user_title,
    u.department AS user_department,
    s.name AS space_name,
    s.color AS space_color,
    0 AS like_count,
    0 AS comment_count,
    FALSE AS user_liked
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN spaces s ON p.space_id = s.id
LEFT JOIN user_spaces us ON us.space_id = s.id AND us.user_id = ?
WHERE (s.is_private = FALSE OR s.is_private IS NULL)
       AND p.user_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, parseInt(limit), parseInt(offset)]
    );

    res.json({ posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Server error while fetching user posts' });
  }
});

router.put('/profile', authenticate, upload.none(), [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('title').optional().trim(),
  body('department').optional().trim(),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
  body('avatar').optional(),
  body('status').optional().isIn(['online', 'away', 'offline']).withMessage('Invalid status') // Added status validation
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, title, department, bio, avatar, status } = req.body;
    const updates = {};
    const params = [];

    if (name !== undefined) { updates.name = name; }
    if (title !== undefined) { updates.title = title; }
    if (department !== undefined) { updates.department = department; }
    if (bio !== undefined) { updates.bio = bio; }
    if (avatar !== undefined) { updates.avatar = avatar; }
    if (status !== undefined) { updates.status = status; } // Added status update

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    params.push(...Object.values(updates), req.user.id);

    await pool.execute(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    const [users] = await pool.execute(
      'SELECT id, name, email, avatar, title, department, bio, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      message: 'Profile updated successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    const followingId = req.params.id;
    const followerId = req.user.id;

    if (followingId == followerId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const [targetUser] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_active = TRUE',
      [followingId]
    );

    if (targetUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [existingFollow] = await pool.execute(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    if (existingFollow.length > 0) {
      await pool.execute(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [followerId, followingId]
      );
      res.json({ message: 'Unfollowed successfully', isFollowing: false });
    } else {
      await pool.execute(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [followerId, followingId]
      );

      await pool.execute(
        `INSERT INTO notifications (user_id, type, title, content, related_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [followingId, 'follow', 'New Follower', `${req.user.name} started following you`, followerId]
      );

      res.json({ message: 'Followed successfully', isFollowing: true });
    }
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    res.status(500).json({ message: 'Server error during follow operation' });
  }
});

router.get('/:id/followers', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;

    const [followers] = await pool.execute(
      `SELECT u.id, u.name, u.avatar, u.title, u.department, f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ? AND u.is_active = TRUE
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error while fetching followers' });
  }
});

router.get('/:id/following', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;

    const [following] = await pool.execute(
      `SELECT u.id, u.name, u.avatar, u.title, u.department, f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ? AND u.is_active = TRUE
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ following });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error while fetching following list' });
  }
});

router.put('/me/password', authenticate, upload.none(), [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT password FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password } = users[0];

    const isMatch = await require('bcryptjs').compare(currentPassword, password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const newHash = await require('bcryptjs').hash(newPassword, 12);

    if (!(await require('bcryptjs').compare(newPassword, newHash))) {
      console.error("something went wrong")
      res.status(500).json({ message: 'Server error while changing password' });
    }

    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [newHash, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error while changing password' });
  }
});

router.put('/status', authenticate, [
  body('status').isIn(['online', 'away', 'offline']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;

    await pool.execute(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, req.user.id]
    );

    res.json({ message: 'Status updated successfully', status });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error while updating status' });
  }
});

router.get('/profile/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const [users] = await pool.execute(
      `SELECT 
        u.*,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count
      FROM users u
      WHERE u.id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    delete user.password;

    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
});

router.get('/:userId/posts', async (req, res) => {
  try {
    const userId = req.params.userId;

    const [posts] = await pool.execute(
      `SELECT 
        p.*,
        s.name AS space_name
      FROM posts p
      LEFT JOIN spaces s ON p.space_id = s.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT 20`,
      [userId]
    );

    res.json({ posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Server error while fetching user posts' });
  }
});

router.get('/:userId/spaces', async (req, res) => {
  try {
    const userId = req.params.userId;

    const [spaces] = await pool.execute(
      `SELECT 
        s.*,
        (SELECT COUNT(*) FROM user_spaces WHERE space_id = s.id) AS member_count,
        (SELECT COUNT(*) FROM posts WHERE space_id = s.id) AS post_count
      FROM spaces s
      JOIN user_spaces us ON s.id = us.space_id
      WHERE us.user_id = ?`,
      [userId]
    );

    res.json({ spaces });
  } catch (error) {
    console.error('Get user spaces error:', error);
    res.status(500).json({ message: 'Server error while fetching user spaces' });
  }
});

module.exports = router;