const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0, unread_only = false } = req.query;
    
    let query = `
      SELECT 
        n.*,
        CASE 
          WHEN n.type = 'like' AND n.related_id IS NOT NULL THEN 
            (SELECT CONCAT(u.name, ' liked your post') FROM users u JOIN posts p ON p.user_id = u.id WHERE p.id = n.related_id)
          WHEN n.type = 'comment' AND n.related_id IS NOT NULL THEN 
            (SELECT CONCAT(u.name, ' commented on your post') FROM users u JOIN posts p ON p.user_id = u.id WHERE p.id = n.related_id)
          WHEN n.type = 'message' AND n.related_id IS NOT NULL THEN 
            (SELECT CONCAT(u.name, ' sent you a message') FROM users u WHERE u.id = n.related_id)
          WHEN n.type = 'space' AND n.related_id IS NOT NULL THEN 
            (SELECT CONCAT('You were added to space: ', s.name) FROM spaces s WHERE s.id = n.related_id)
          WHEN n.type = 'space_req' AND n.related_id IS NOT NULL THEN 
            (SELECT CONCAT(s.name, 'Requested to join the space') FROM spaces s WHERE s.id = n.related_id)
          ELSE n.content
        END as formatted_content
      FROM notifications n
      WHERE n.user_id = ?
    `;
    
    const params = [req.user.id];
    
    if (unread_only === 'true') {
      query += ` AND n.is_read = FALSE`;
    }
    
    query += ` ORDER BY n.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [notifications] = await pool.execute(query, params);
    
    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    
    res.json({ unreadCount: result[0].count });
  } catch (error) {
    console.error('Get unread notifications count error:', error);
    res.status(500).json({ message: 'Server error while fetching unread count' });
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found or not authorized' });
    }
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error while marking notification as read' });
  }
});

router.put('/read-all', authenticate, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error while marking all notifications as read' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found or not authorized' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error while deleting notification' });
  }
});

router.delete('/clear-all', authenticate, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM notifications WHERE user_id = ?',
      [req.user.id]
    );
    
    res.json({ message: 'All notifications cleared successfully' });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ message: 'Server error while clearing all notifications' });
  }
});

module.exports = router;