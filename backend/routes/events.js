const express = require('express');
const { body, validationResult } = require('express-validator');
const { format } = require('date-fns');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const [events] = await pool.execute(`
      SELECT 
        e.id, e.title, e.description, e.start, e.end, e.isPrivate,
        e.creator_id, u.name AS creator_name, u.avatar AS creator_avatar,
        JSON_ARRAYAGG(DISTINCT em.user_id) AS mentions
      FROM events e
      JOIN users u ON e.creator_id = u.id
      LEFT JOIN event_mentions em ON e.id = em.event_id
      WHERE (
          e.creator_id = ? 
          OR e.isPrivate = FALSE
          OR (e.isPrivate = TRUE AND em.user_id = ?)
        )
      GROUP BY e.id
      ORDER BY e.start ASC
    `, [req.user.id, req.user.id]);

        const formattedEvents = events.map(event => ({
            ...event,
            mentions: JSON.parse(event.mentions).filter(id => id !== null)
        }));

        res.json({ events: formattedEvents });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ message: 'Server error while fetching events' });
    }
});

router.post('/', authenticate, [
    body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
    body('start').isISO8601().withMessage('Valid start date is required'),
    body('end').isISO8601().withMessage('Valid end date is required'),
    body('isPrivate').isBoolean().withMessage('isPrivate must be boolean'),
    body('description').optional().trim().isLength({ min: 0 }),
    body('mentions').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            title,
            description = '',
            start,
            end,
            isPrivate = false,
            mentions = []
        } = req.body;

        const startDate = format(start, 'yyyy-MM-dd HH:mm:ss');
        const endDate = format(end, 'yyyy-MM-dd HH:mm:ss');

        if (startDate >= endDate) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [eventResult] = await connection.execute(
                `INSERT INTO events 
         (title, description, start, end, isPrivate, creator_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
                [title, description, startDate, endDate, isPrivate, req.user.id]
            );

            const eventId = eventResult.insertId;

            if (mentions.length > 0) {
                const mentionValues = mentions.map(userId => [eventId, userId]);
                await connection.query(
                    'INSERT INTO event_mentions (event_id, user_id) VALUES ?',
                    [mentionValues]
                );
            }

            await connection.commit();

            const [newEvent] = await pool.execute(`
        SELECT 
          e.*, 
          u.name AS creator_name, 
          u.avatar AS creator_avatar,
          (SELECT JSON_ARRAYAGG(user_id) FROM event_mentions WHERE event_id = e.id) AS mentions
        FROM events e
        JOIN users u ON e.creator_id = u.id
        WHERE e.id = ?
      `, [eventId]);

            const formattedEvent = {
                ...newEvent[0],
                mentions: JSON.parse(newEvent[0].mentions || '[]')
            };

            const allUsers = [...new Set(mentions)];
            const notificationPromises = allUsers.map(userId =>
                pool.execute(
                    `INSERT INTO notifications (user_id, type, title, content, related_id) 
           VALUES (?, ?, ?, ?, ?)`,
                    [
                        userId,
                        'event',
                        'New Event',
                        `${req.user.name} mentioned you in an event`,
                        eventId
                    ]
                )
            );

            await Promise.all(notificationPromises);

            const io = req.app.get('io');
            allUsers.forEach(userId => {
                io.emit(`user-${userId}`, {
                    type: 'new-event',
                    event: formattedEvent
                });
            });

            res.status(201).json({
                message: 'Event created successfully',
                event: formattedEvent
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ message: 'Server error while creating event' });
    }
});

router.put('/:id', authenticate, [
    body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
    body('start').isISO8601().withMessage('Valid start date is required'),
    body('end').isISO8601().withMessage('Valid end date is required'),
    body('isPrivate').isBoolean().withMessage('isPrivate must be boolean'),
    body('description').optional().trim().isLength({ min: 0 }),
    body('mentions').optional().isArray()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const eventId = req.params.id;
        const {
            title,
            description,
            start,
            end,
            isPrivate,
            mentions
        } = req.body;

        const startDate = format(start, 'yyyy-MM-dd HH:mm:ss');
        const endDate = format(end, 'yyyy-MM-dd HH:mm:ss');

        const [events] = await pool.execute(
            'SELECT creator_id FROM events WHERE id = ?',
            [eventId]
        );

        if (events.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (events[0].creator_id !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: 'Not authorized to update this event' });
        }

        if (start && end) {
            if (new Date(start) >= new Date(end)) {
                return res.status(400).json({ message: 'End date must be after start date' });
            }
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const updateFields = [];
            const updateValues = [];

            if (title) {
                updateFields.push('title = ?');
                updateValues.push(title);
            }

            if (description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(description);
            }

            if (start) {
                updateFields.push('start = ?');
                updateValues.push(startDate);
            }

            if (end) {
                updateFields.push('end = ?');
                updateValues.push(endDate);
            }

            if (isPrivate !== undefined) {
                updateFields.push('isPrivate = ?');
                updateValues.push(isPrivate);
            }

            if (updateFields.length > 0) {
                updateValues.push(eventId);
                await connection.execute(
                    `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`,
                    updateValues
                );
            }

            if (mentions !== undefined) {
                await connection.execute(
                    'DELETE FROM event_mentions WHERE event_id = ?',
                    [eventId]
                );

                if (mentions.length > 0) {
                    const mentionValues = mentions.map(userId => [eventId, userId]);
                    await connection.query(
                        'INSERT INTO event_mentions (event_id, user_id) VALUES ?',
                        [mentionValues]
                    );
                }
            }

            await connection.commit();

            const [updatedEvent] = await pool.execute(`
        SELECT 
          e.*, 
          u.name AS creator_name, 
          u.avatar AS creator_avatar,
          (SELECT JSON_ARRAYAGG(user_id) FROM event_mentions WHERE event_id = e.id) AS mentions
        FROM events e
        JOIN users u ON e.creator_id = u.id
        WHERE e.id = ?
      `, [eventId]);

            const formattedEvent = {
                ...updatedEvent[0],
                mentions: JSON.parse(updatedEvent[0].mentions || '[]')
            };

            const participants = [
                ...new Set([
                    req.user.id,
                    ...(mentions !== undefined ? mentions : formattedEvent.mentions)
                ])
            ];

            const io = req.app.get('io');
            participants.forEach(userId => {
                io.emit(`user-${userId}`, {
                    type: 'update-event',
                    event: formattedEvent
                });
            });

            res.json({
                message: 'Event updated successfully',
                event: formattedEvent
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ message: 'Server error while updating event' });
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        const eventId = req.params.id;

        const [events] = await pool.execute(
            'SELECT creator_id FROM events WHERE id = ?',
            [eventId]
        );

        if (events.length === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (events[0].creator_id !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: 'Not authorized to delete this event' });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [participants] = await connection.execute(`
        SELECT user_id FROM event_mentions WHERE event_id = ?
        UNION
        SELECT creator_id FROM events WHERE id = ?
      `, [eventId, eventId]);

            await connection.execute(
                'DELETE FROM event_mentions WHERE event_id = ?',
                [eventId]
            );

            await connection.execute("DELETE FROM event_mentions WHERE event_id = ?", [eventId]);
            await connection.execute("DELETE FROM events WHERE id = ?", [eventId]);


            await connection.execute(
                'DELETE FROM events WHERE id = ?',
                [eventId]
            );

            await connection.commit();

            const io = req.app.get('io');
            participants.forEach(participant => {
                io.emit(`user-${participant.user_id}`, {
                    type: 'delete-event',
                    eventId
                });
            });

            res.json({ message: 'Event deleted successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ message: 'Server error while deleting event' });
    }
});

router.get('/users/search', authenticate, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    const [users] = await pool.execute(
      `SELECT id, name, email, avatar, department 
       FROM users 
       WHERE (name LIKE ? OR email LIKE ?)
         AND id != ? 
         AND is_active = TRUE`,
      [`%${query}%`, `%${query}%`, req.user.id]
    );

    res.json({ users });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ message: 'Server error while searching users' });
  }
});

module.exports = router;