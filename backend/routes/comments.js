const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const [comments] = await pool.execute(`
      SELECT 
        c.*,
        u.name as user_name,
        u.avatar as user_avatar,
        u.title as user_title,
        (SELECT COUNT(*) FROM likes WHERE comment_id = c.id) as like_count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND u.is_active = TRUE
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `, [postId, parseInt(limit), parseInt(offset)]);
    
    const commentMap = new Map();
    const rootComments = [];
    
    comments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
      
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });
    
    res.json({ comments: rootComments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error while fetching comments' });
  }
});

router.post('/:postId/comments', authenticate, [
  body('content').trim().isLength({ min: 1 }).withMessage('Comment content is required'),
  body('parent_id').optional().isInt().withMessage('Invalid parent comment ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { postId } = req.params;
    const { content, parent_id } = req.body;
    
    const [posts] = await pool.execute(
      'SELECT user_id FROM posts WHERE id = ?',
      [postId]
    );
    
    if (posts.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (parent_id) {
      const [parentComment] = await pool.execute(
        'SELECT id FROM comments WHERE id = ? AND post_id = ?',
        [parent_id, postId]
      );
      
      if (parentComment.length === 0) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
    }
    
    const [result] = await pool.execute(
      'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, parent_id || null, content]
    );
    
    const [comments] = await pool.execute(`
      SELECT 
        c.*,
        u.name as user_name,
        u.avatar as user_avatar,
        u.title as user_title,
        0 as like_count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.insertId]);
    
    if (posts[0].user_id !== req.user.id) {
      await pool.execute(
        `INSERT INTO notifications (user_id, type, title, content, related_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [posts[0].user_id, 'comment', 'New Comment', `${req.user.name} commented on your post`, postId]
      );
    }
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment: comments[0]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error while adding comment' });
  }
});

router.put('/:id', authenticate, [
  body('content').trim().isLength({ min: 1 }).withMessage('Comment content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const commentId = req.params.id;
    const { content } = req.body;
    
    const [comments] = await pool.execute(
      'SELECT user_id FROM comments WHERE id = ?',
      [commentId]
    );
    
    if (comments.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    if (comments[0].user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }
    
    await pool.execute(
      'UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [content, commentId]
    );
    
    res.json({ message: 'Comment updated successfully' });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error while updating comment' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const commentId = req.params.id;
    
    const [comments] = await pool.execute(
      'SELECT user_id FROM comments WHERE id = ?',
      [commentId]
    );
    
    if (comments.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    if (comments[0].user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    
    await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error while deleting comment' });
  }
});

router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const commentId = req.params.id;
    
    const [comments] = await pool.execute(
      'SELECT user_id FROM comments WHERE id = ?',
      [commentId]
    );
    
    if (comments.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    const [existingLike] = await pool.execute(
      'SELECT id FROM likes WHERE user_id = ? AND comment_id = ?',
      [req.user.id, commentId]
    );
    
    if (existingLike.length > 0) {
      await pool.execute(
        'DELETE FROM likes WHERE user_id = ? AND comment_id = ?',
        [req.user.id, commentId]
      );
      
      res.json({ message: 'Comment unliked', liked: false });
    } else {
      await pool.execute(
        'INSERT INTO likes (user_id, comment_id) VALUES (?, ?)',
        [req.user.id, commentId]
      );
      
      res.json({ message: 'Comment liked', liked: true });
    }
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error while liking comment' });
  }
});

module.exports = router;