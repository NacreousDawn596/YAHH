const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

router.post('/upload', authenticate, upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const fileData = files.map(file => ({
      url: `/uploads/${file.filename}`,
      name: file.originalname,
      type: file.mimetype.startsWith('image/') ? 'image' : 
            file.mimetype.startsWith('video/') ? 'video' : 'file'
    }));
    
    res.json({ files: fileData });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error while uploading files' });
  }
});

const getOrCreateConversation = async (participantIds, isGroup = false, groupName = null) => {
  if (!isGroup && participantIds.length === 2) {
    const [existingConvs] = await pool.execute(`
      SELECT c.id 
      FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
      WHERE c.is_group = FALSE
      AND cp1.user_id = ?
      AND cp2.user_id = ?
      GROUP BY c.id
      HAVING COUNT(DISTINCT cp1.user_id) = 2
    `, [participantIds[0], participantIds[1]]);

    if (existingConvs.length > 0) {
      return existingConvs[0].id;
    }
  }

  const conversationId = uuidv4();
  await pool.execute(
    `INSERT INTO conversations (id, name, is_group, created_at) 
    VALUES (?, ?, ?, NOW())`,
    [conversationId, groupName, isGroup]
  );

  for (const userId of participantIds) {
    await pool.execute(
      `INSERT INTO conversation_participants (conversation_id, user_id) 
      VALUES (?, ?)`,
      [conversationId, userId]
    );
  }

  return conversationId;
};

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const [currentUser] = await pool.execute(`SELECT name FROM users WHERE id = ?`, [userId]);

    const [conversations] = await pool.execute(`
      SELECT
        c.id,
        c.name,
        c.is_group,
        MAX(m.created_at) as last_message_time,
        COALESCE(MAX(m.content), '') as last_message,
        COUNT(DISTINCT mr.id) as unread_count,
        GROUP_CONCAT(DISTINCT u.id SEPARATOR ',') as participant_ids,
        GROUP_CONCAT(DISTINCT u.name SEPARATOR ',') as participant_names
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN messages m ON m.conversation_id = c.id
      LEFT JOIN message_recipients mr ON mr.message_id = m.id AND mr.user_id = ? AND mr.is_read = FALSE
      WHERE cp.user_id = ?
      GROUP BY c.id
      ORDER BY last_message_time DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, limit, offset]);

    const formattedConvs = conversations.map(conv => {
      const participantIds = conv.participant_ids.split(',');
      const participantNames = conv.participant_names.split(',');

      const otherParticipants = participantIds
        .filter(id => id != userId)
        .map((id, idx) => ({
          id,
          name: participantNames[participantIds.indexOf(id)]
        }));

      try {
        conv.name = JSON.parse(conv.name).filter((i) => i != currentUser[0].name.replace(" ", "_")).join(" and ");
      } catch (e) {
        console.error(e);
        if (!conv.name) {
          conv.name = otherParticipants.map((user) => user.name).filter((i) => i != currentUser[0].name).join(" and ");
        }
      }

      if (!conv.is_group && otherParticipants.length === 1) {
        return {
          id: conv.id,
          other_user_id: otherParticipants[0].id,
          other_user_name: otherParticipants[0].name,
          last_message: conv.last_message,
          last_message_time: conv.last_message_time,
          unread_count: conv.unread_count,
          is_group: false
        };
      }

      return {
        id: conv.id,
        name: conv.name || otherParticipants.map(p => p.name).join(', '),
        last_message: conv.last_message,
        last_message_time: conv.last_message_time,
        unread_count: conv.unread_count,
        is_group: true,
        participants: otherParticipants
      };
    });

    res.json({ conversations: formattedConvs });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error while fetching conversations' });
  }
});

router.get('/conversations/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const [currentUser] = await pool.execute(`SELECT * FROM users WHERE id = ?`, [currentUserId]);

    const [participation] = await pool.execute(
      `SELECT 1 
      FROM conversation_participants 
      WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, currentUserId]
    );

    if (participation.length === 0) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const [[conversation]] = await pool.execute(
      `SELECT id, name, is_group 
      FROM conversations 
      WHERE id = ?`,
      [conversationId]
    );

    const [messages] = await pool.execute(
      `SELECT 
        m.id, m.content, m.created_at, m.edited_at,
        m.sender_id,
        u.name as author,
        u.avatar as sender_avatar,
        mr.is_read as is_read,
        COALESCE(JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', a.id,
            'url', a.url,
            'name', a.file_name,
            'type', a.file_type
          )
        ), JSON_ARRAY()) as attachments
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN message_recipients mr ON mr.message_id = m.id AND mr.user_id = ?
      LEFT JOIN message_attachments a ON m.id = a.message_id
      WHERE m.conversation_id = ?
      GROUP BY m.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`,
      [currentUserId, conversationId, limit, offset]
    );

    if (messages.length > 0) {
      await pool.execute(`
        INSERT INTO message_recipients (message_id, user_id, is_read, read_at)
        SELECT m.id, ?, TRUE, NOW()
        FROM messages m
        WHERE m.conversation_id = ?
        AND m.id IN (${messages.map(m => m.id).join(',')})
        ON DUPLICATE KEY UPDATE is_read = TRUE, read_at = NOW()
      `, [currentUserId, conversationId]);
    }

    let participants = [];
    if (conversation.is_group) {
      const [users] = await pool.execute(
        `SELECT u.id, u.name, u.avatar, u.title
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id = ?`,
        [conversationId]
      );
      participants = users;
    }

    res.json({
      messages,
      conversation: {
        id: conversation.id,
        name: conversation.name,
        is_group: conversation.is_group,
        participants
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error while fetching messages' });
  }
});

router.post('/conversations', authenticate, [
  body('participant_ids').isArray({ min: 1 }).withMessage('At least one participant is required'),
  body('is_group').optional().isBoolean(),
  body('name').optional().isString().trim()
], async (req, res) => {
  try {
    let conversationId;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { participant_ids, is_group = false, name = null } = req.body;
    const currentUserId = req.user.id;

    const allParticipants = [...new Set([currentUserId, ...participant_ids])];

    if (allParticipants.length === 0) {
      return res.status(400).json({ message: 'No participants provided' });
    }

    const placeholders = allParticipants.map(() => '?').join(',');
    const [users] = await pool.execute(
      `SELECT id, name FROM users WHERE id IN (${placeholders}) AND is_active = TRUE`,
      allParticipants
    );

    if (users.length !== allParticipants.length) {
      return res.status(404).json({ message: 'One or more participants not found' });
    }

    let groupName = name;
    if (!groupName) {
      const namePromises = allParticipants.map(async (id) => {
        const [[nn]] = await pool.execute(`SELECT name FROM users WHERE id = ?`, [id]);
        return nn.name.split(' ').join('_');
      });

      const names = await Promise.all(namePromises);
      groupName = JSON.stringify(names);
    }
    
    conversationId = await getOrCreateConversation(
      allParticipants,
      is_group,
      groupName
    );

    const [[conversation]] = await pool.execute(
      `SELECT id, name, is_group
      FROM conversations 
      WHERE id = ?`,
      [conversationId]
    );

    conversation.participants = allParticipants;

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Server error while creating conversation' });
  }
});

router.post('/conversations/:conversationId/messages', authenticate, [
  body('content').trim().isLength({ max: 20000 }).withMessage('Message content must be less than 20000 characters'),
  body('attachments').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId } = req.params;
    const { content, attachments = [] } = req.body;
    const sender_id = req.user.id;

    const [participation] = await pool.execute(
      `SELECT 1 
      FROM conversation_participants 
      WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, sender_id]
    );

    if (participation.length === 0) {
      return res.status(403).json({ message: 'Not authorized to send messages to this conversation' });
    }

    const [result] = await pool.execute(
      `INSERT INTO messages 
      (conversation_id, sender_id, content, created_at, attachements) 
      VALUES (?, ?, ?, NOW(), ?)`,
      [conversationId, sender_id, content, JSON.stringify(attachments)]
    );
    const messageId = result.insertId;

    if (attachments.length > 0) {
      const values = attachments.map(att => [messageId, att.url, att.name, att.type]);
      await pool.query(
        `INSERT INTO message_attachments (message_id, url, file_name, file_type) 
        VALUES ?`,
        [values]
      );
    }

    const [[newMessage]] = await pool.execute(`
      SELECT 
        m.*,
        u.name as author,
        u.avatar as sender_avatar,
        COALESCE(JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', a.id,
            'url', a.url,
            'name', a.file_name,
            'type', a.file_type
          )
        ), JSON_ARRAY()) as attachments
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN message_attachments a ON m.id = a.message_id
      WHERE m.id = ?
      GROUP BY m.id
    `, [messageId]);

    const [participants] = await pool.execute(
      `SELECT user_id 
      FROM conversation_participants 
      WHERE conversation_id = ? AND user_id != ?`,
      [conversationId, sender_id]
    );

    const io = req.app.get('io');

    participants.forEach(user => {
      const room = `user-${user.user_id}`;
      io.to(room).emit('new-message', {
        ...newMessage,
        conversation_id: conversationId
      });
    });

    participants.forEach(user => {
      const room = `user-${user.user_id}`;
      io.to(room).emit('update-conversations');
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
});

router.post('/conversations/:conversationId/read', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(
      `UPDATE message_recipients mr
      JOIN messages m ON m.id = mr.message_id
      SET mr.is_read = TRUE, mr.read_at = NOW()
      WHERE m.conversation_id = ?
      AND mr.user_id = ?
      AND mr.is_read = FALSE`,
      [conversationId, userId]
    );

    const io = req.app.get('io');
    io.to(`user-${userId}`).emit('update-unread-count');

    res.json({ success: true, updatedCount: result.affectedRows });
  } catch (error) {
    console.error('Mark conversation read error:', error);
    res.status(500).json({ message: 'Server error while marking conversation as read' });
  }
});

router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `SELECT COUNT(*) as count 
      FROM message_recipients mr
      JOIN messages m ON m.id = mr.message_id
      WHERE mr.user_id = ? 
      AND mr.is_read = FALSE
      AND m.deleted_at IS NULL`,
      [req.user.id]
    );

    res.json({ unreadCount: result[0].count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error while fetching unread count' });
  }
});

module.exports = router;