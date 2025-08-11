const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

const logAdminAction = async (adminId, action, targetType, targetId, details = {}) => {
  try {
    await pool.execute(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) 
       VALUES (?, ?, ?, ?, ?)`,
      [adminId, action, targetType, targetId, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Admin log error:', error);
  }
};

router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', async (req, res) => {
  try {
    const [
      [userCount],
      [postCount],
      [spaceCount],
      [messageCount],
      [recentUsers],
      [recentPosts],
      [activeUsers],
      [topSpaces]
    ] = await Promise.all([
      pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE'),
      pool.execute('SELECT COUNT(*) as count FROM posts'),
      pool.execute('SELECT COUNT(*) as count FROM spaces'),
      pool.execute('SELECT COUNT(*) as count FROM messages'),
      pool.execute('SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'),
      pool.execute('SELECT COUNT(*) as count FROM posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'),
      pool.execute('SELECT COUNT(*) as count FROM users WHERE status IN ("online", "away") OR updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'),
      pool.execute(`
        SELECT s.name, s.id, COUNT(us.user_id) as member_count
        FROM spaces s
        LEFT JOIN user_spaces us ON s.id = us.space_id
        GROUP BY s.id, s.name
        ORDER BY member_count DESC
        LIMIT 5
      `)
    ]);

    res.json({
      stats: {
        totalUsers: userCount[0].count,
        totalPosts: postCount[0].count,
        totalSpaces: spaceCount[0].count,
        totalMessages: messageCount[0].count,
        recentUsers: recentUsers[0].count,
        recentPosts: recentPosts[0].count,
        activeUsers: activeUsers[0].count,
        topSpaces: topSpaces[0]
      }
    });
    
    await logAdminAction(req.user.id, 'view_stats', 'system', null);
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Server error while fetching statistics' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { search, status, role, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count,
        (SELECT COUNT(*) FROM user_spaces WHERE user_id = u.id) as space_count
      FROM users u
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      if (status === 'active') query += ` AND u.is_active = TRUE`;
      else if (status === 'inactive') query += ` AND u.is_active = FALSE`;
      else if (status === 'suspended') query += ` AND u.is_suspended = TRUE`;
    }

    if (role) {
      if (role === 'admin') query += ` AND u.is_admin = TRUE`;
      else if (role === 'moderator') query += ` AND u.is_moderator = TRUE`;
    }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [users] = await pool.execute(query, params);
    users.forEach(user => delete user.password);

    res.json({ users, total: users.length });
    await logAdminAction(req.user.id, 'view_users', 'users', null, { count: users.length });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

router.post('/users', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('title').optional().trim(),
  body('department').optional().trim(),
  body('is_admin').optional().isBoolean().withMessage('is_admin must be boolean'),
  body('is_moderator').optional().isBoolean().withMessage('is_moderator must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, title, department, is_admin = false, is_moderator = false } = req.body;

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password, title, department, is_admin, is_moderator, email_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [name, email, hashedPassword, title || null, department || null, is_admin, is_moderator]
    );

    await logAdminAction(req.user.id, 'create_user', 'user', result.insertId, {
      name, email, is_admin, is_moderator
    });
    
    res.status(201).json({
      message: 'User created successfully',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error while creating user' });
  }
});

router.put('/users/:id', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email'),
  body('title').optional().trim(),
  body('department').optional().trim(),
  body('is_admin').optional().isBoolean().withMessage('is_admin must be boolean'),
  body('is_moderator').optional().isBoolean().withMessage('is_moderator must be boolean'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  body('is_suspended').optional().isBoolean().withMessage('is_suspended must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const { 
      name, email, title, department, 
      is_admin, is_moderator, is_active, is_suspended 
    } = req.body;

    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = users[0];
    
    if (userId == req.user.id && 
        (is_admin !== undefined || is_moderator !== undefined || is_active !== undefined)) {
      return res.status(400).json({ message: 'Cannot modify your own privileges' });
    }

    if (email) {
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (title !== undefined) updates.title = title;
    if (department !== undefined) updates.department = department;
    if (is_admin !== undefined) updates.is_admin = is_admin;
    if (is_moderator !== undefined) updates.is_moderator = is_moderator;
    if (is_active !== undefined) updates.is_active = is_active;
    if (is_suspended !== undefined) updates.is_suspended = is_suspended;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const params = [...Object.values(updates), userId];

    await pool.execute(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    await logAdminAction(req.user.id, 'update_user', 'user', userId, updates);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { permanent = false } = req.query;

    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userId == req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    if (permanent === 'true') {
      await pool.execute('DELETE FROM posts WHERE user_id = ?', [userId]);
      await pool.execute('DELETE FROM comments WHERE user_id = ?', [userId]);
      await pool.execute('DELETE FROM likes WHERE user_id = ?', [userId]);
      await pool.execute('DELETE FROM messages WHERE sender_id = ?', [userId]);
      await pool.execute('DELETE FROM user_spaces WHERE user_id = ?', [userId]);
      await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
      
      res.json({ message: 'User permanently deleted' });
    } else {
      await pool.execute(
        'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );
      res.json({ message: 'User deactivated successfully' });
    }
    
    await logAdminAction(req.user.id, permanent ? 'delete_user' : 'deactivate_user', 'user', userId);
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
});

router.post('/users/:id/ban', [
  body('reason').trim().isLength({ min: 5 }).withMessage('Reason must be at least 5 characters'),
  body('duration').isInt({ min: 1, max: 365 }).withMessage('Duration must be between 1-365 days')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const { reason, duration } = req.body;

    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userId == req.user.id) {
      return res.status(400).json({ message: 'Cannot ban yourself' });
    }

    await pool.execute(
      `UPDATE users 
       SET is_suspended = TRUE, suspension_reason = ?, suspension_end = DATE_ADD(NOW(), INTERVAL ? DAY) 
       WHERE id = ?`,
      [reason, duration, userId]
    );

    await logAdminAction(req.user.id, 'ban_user', 'user', userId, { reason, duration });
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ message: 'Server error while banning user' });
  }
});

router.post('/users/:id/unban', async (req, res) => {
  try {
    const userId = req.params.id;

    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await pool.execute(
      `UPDATE users 
       SET is_suspended = FALSE, suspension_reason = NULL, suspension_end = NULL 
       WHERE id = ?`,
      [userId]
    );

    await logAdminAction(req.user.id, 'unban_user', 'user', userId);
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ message: 'Server error while unbanning user' });
  }
});

router.get('/spaces', async (req, res) => {
  try {
    const { search, privacy, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT 
        s.*,
        u.name as created_by_name,
        (SELECT COUNT(*) FROM user_spaces WHERE space_id = s.id) as member_count,
        (SELECT COUNT(*) FROM posts WHERE space_id = s.id) as post_count
      FROM spaces s
      JOIN users u ON s.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND s.name LIKE ?`;
      params.push(`%${search}%`);
    }

    if (privacy) {
      if (privacy === 'private') query += ` AND s.is_private = TRUE`;
      else if (privacy === 'public') query += ` AND s.is_private = FALSE`;
    }

    query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [spaces] = await pool.execute(query, params);

    res.json({ spaces, total: spaces.length });
    await logAdminAction(req.user.id, 'view_spaces', 'spaces', null, { count: spaces.length });
  } catch (error) {
    console.error('Get spaces error:', error);
    res.status(500).json({ message: 'Server error while fetching spaces' });
  }
});

router.put('/spaces/:id', [
  body('name').optional().trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  body('description').optional().trim(),
  body('is_private').optional().isBoolean().withMessage('is_private must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const spaceId = req.params.id;
    const { name, description, is_private } = req.body;

    const [spaces] = await pool.execute('SELECT * FROM spaces WHERE id = ?', [spaceId]);
    if (spaces.length === 0) {
      return res.status(404).json({ message: 'Space not found' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (is_private !== undefined) updates.is_private = is_private;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const params = [...Object.values(updates), spaceId];

    await pool.execute(
      `UPDATE spaces SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    await logAdminAction(req.user.id, 'update_space', 'space', spaceId, updates);
    res.json({ message: 'Space updated successfully' });
  } catch (error) {
    console.error('Update space error:', error);
    res.status(500).json({ message: 'Server error while updating space' });
  }
});

router.delete('/spaces/:id', async (req, res) => {
  try {
    const spaceId = req.params.id;

    const [spaces] = await pool.execute('SELECT * FROM spaces WHERE id = ?', [spaceId]);
    if (spaces.length === 0) {
      return res.status(404).json({ message: 'Space not found' });
    }

    await pool.execute('DELETE FROM posts WHERE space_id = ?', [spaceId]);
    await pool.execute('DELETE FROM user_spaces WHERE space_id = ?', [spaceId]);
    await pool.execute('DELETE FROM spaces WHERE id = ?', [spaceId]);

    await logAdminAction(req.user.id, 'delete_space', 'space', spaceId);
    res.json({ message: 'Space deleted successfully' });
  } catch (error) {
    console.error('Delete space error:', error);
    res.status(500).json({ message: 'Server error while deleting space' });
  }
});

router.get('/posts', async (req, res) => {
  try {
    const { search, space, user, flagged, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        s.name as space_name,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN spaces s ON p.space_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND p.content LIKE ?`;
      params.push(`%${search}%`);
    }

    if (space) {
      query += ` AND p.space_id = ?`;
      params.push(space);
    }

    if (user) {
      query += ` AND p.user_id = ?`;
      params.push(user);
    }

    if (flagged === 'true') {
      query += ` AND p.id IN (SELECT DISTINCT post_id FROM post_reports)`;
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [posts] = await pool.execute(query, params);

    res.json({ posts, total: posts.length });
    await logAdminAction(req.user.id, 'view_posts', 'posts', null, { count: posts.length });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error while fetching posts' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;

    const [posts] = await pool.execute('SELECT * FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await pool.execute('DELETE FROM comments WHERE post_id = ?', [postId]);
    await pool.execute('DELETE FROM likes WHERE post_id = ?', [postId]);
    await pool.execute('DELETE FROM posts WHERE id = ?', [postId]);

    await logAdminAction(req.user.id, 'delete_post', 'post', postId);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error while deleting post' });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const { conversation, user, limit = 100, offset = 0 } = req.query;
    let query = `
      SELECT 
        m.*,
        u.name as sender_name,
        c.name as conversation_name,
        GROUP_CONCAT(p.user_id) as participant_ids
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN conversations c ON m.conversation_id = c.id
      LEFT JOIN conversation_participants p ON m.conversation_id = p.conversation_id
      WHERE 1=1
    `;
    const params = [];



    query += ` GROUP BY m.id ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [messages] = await pool.execute(query, params);

    for (const message of messages) {
      if (message.participant_ids) {
        const [participants] = await pool.execute(
          `SELECT name FROM users WHERE id IN (${message.participant_ids})`
        );
        message.participants = participants.map(p => p.name);
      }
    }

    res.json({ messages, total: messages.length });
    await logAdminAction(req.user.id, 'view_messages', 'messages', null, { count: messages.length });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
});

router.delete('/messages/:id', async (req, res) => {
  try {
    const messageId = req.params.id;

    const [messages] = await pool.execute('SELECT * FROM messages WHERE id = ?', [messageId]);
    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await pool.execute('DELETE FROM messages WHERE id = ?', [messageId]);

    await logAdminAction(req.user.id, 'delete_message', 'message', messageId);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error while deleting message' });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { action, admin, target, limit = 100, offset = 0 } = req.query;
    let query = `
      SELECT 
        l.*,
        a.name as admin_name
      FROM admin_logs l
      JOIN users a ON l.admin_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      query += ` AND l.action = ?`;
      params.push(action);
    }

    if (admin) {
      query += ` AND l.admin_id = ?`;
      params.push(admin);
    }

    if (target) {
      query += ` AND (l.target_type = ? OR l.target_id = ?)`;
      params.push(target, target);
    }

    query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await pool.execute(query, params);
    
    logs.forEach(log => {
      if (log.details) {
        try {
          log.details = JSON.parse(log.details);
        } catch {
          log.details = {};
        }
      }
    });

    res.json({ logs, total: logs.length });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Server error while fetching logs' });
  }
});

router.get('/config', async (req, res) => {
  try {
    const [config] = await pool.execute('SELECT * FROM system_config');
    res.json({ config });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ message: 'Server error while fetching config' });
  }
});

router.put('/config', [
  body('key').trim().isLength({ min: 3 }).withMessage('Key must be at least 3 characters'),
  body('value').trim().isLength({ min: 1 }).withMessage('Value is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { key, value } = req.body;
    
    await pool.execute(
      `INSERT INTO system_config (config_key, config_value) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE config_value = ?`,
      [key, value, value]
    );
    
    await logAdminAction(req.user.id, 'update_config', 'system', key, { value });
    res.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ message: 'Server error while updating config' });
  }
});

router.post('/broadcast', [
  body('title').trim().isLength({ min: 5 }).withMessage('Title must be at least 5 characters'),
  body('content').trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('type').isIn(['announcement', 'maintenance', 'update']).withMessage('Invalid type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, type } = req.body;

    const [users] = await pool.execute('SELECT id FROM users WHERE is_active = TRUE');
    const notifications = users.map(user => [user.id, type, title, content, null, false]);

    if (notifications.length > 0) {
      const placeholders = notifications.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const flatValues = notifications.flat();

      await pool.execute(
        `INSERT INTO notifications (user_id, type, title, content, related_id, is_read) 
         VALUES ${placeholders}`,
        flatValues
      );
    }

    await logAdminAction(req.user.id, 'broadcast', 'system', null, {
      type, title, recipient_count: users.length
    });
    
    res.json({
      message: 'Broadcast sent successfully',
      recipientCount: users.length
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ message: 'Server error while sending broadcast' });
  }
});

router.get('/user-settings/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const [settings] = await pool.execute(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );
    
    if (settings.length === 0) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    
    res.json({ settings: settings[0] });
    await logAdminAction(req.user.id, 'view_user_settings', 'user', userId);
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({ message: 'Server error while fetching settings' });
  }
});

router.put('/user-settings/:id', [
  body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Invalid theme'),
  body('notifications').optional().isBoolean().withMessage('Notifications must be boolean'),
  body('email_notifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('language').optional().isIn(['en', 'es', 'fr', 'de']).withMessage('Invalid language'),
  body('timezone').optional().isIn([
    'UTC', 'America/New_York', 'America/Chicago', 
    'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Asia/Tokyo'
  ]).withMessage('Invalid timezone'),
  body('font_size').optional().isIn(['small', 'medium', 'large']).withMessage('Invalid font size')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const updates = req.body;
    
    const [settings] = await pool.execute(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );
    
    if (settings.length === 0) {
      await pool.execute(
        `INSERT INTO user_settings (user_id) VALUES (?)`,
        [userId]
      );
    }
    
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    updateValues.push(userId);
    
    await pool.execute(
      `UPDATE user_settings SET ${updateFields.join(', ')} WHERE user_id = ?`,
      updateValues
    );
    
    await logAdminAction(req.user.id, 'update_user_settings', 'user', userId, updates);
    res.json({ message: 'User settings updated successfully' });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ message: 'Server error while updating settings' });
  }
});

module.exports = router;