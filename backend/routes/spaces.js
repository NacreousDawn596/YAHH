const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const { my_spaces, search, limit = 20, offset = 0 } = req.query;

        let query, params;

        if (!(my_spaces === 'true')) {
            query = `
        SELECT 
          s.*,
          u.name as created_by_name,
          us.role as user_role,
          us.joined_at,
          (SELECT COUNT(*) FROM user_spaces WHERE space_id = s.id) as member_count
        FROM spaces s
        JOIN users u ON s.created_by = u.id
        JOIN user_spaces us ON s.id = us.space_id AND us.user_id = ?
        WHERE u.is_active = TRUE
      `;
            params = [req.user.id];
        } else {
            query = `SELECT 
    s.*,
    u.name AS created_by_name,
    us.role AS user_role,
    us.joined_at AS ja,
    (
        SELECT COUNT(*) 
        FROM user_spaces 
        WHERE space_id = s.id
    ) AS member_count
FROM spaces s
JOIN users u ON s.created_by = u.id
LEFT JOIN user_spaces us ON us.space_id = s.id AND us.user_id = ?
WHERE s.is_private = FALSE
  AND u.is_active = TRUE
`;
            params = [req.user.id];
        }

        if (search) {
            query += ` AND (s.name LIKE ? OR s.description LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [spaces] = await pool.execute(query, params);


        res.json({ spaces });
    } catch (error) {
        console.error('Get spaces error:', error);
        res.status(500).json({ message: 'Server error while fetching spaces' });
    }
});

router.post('/', authenticate, [
    body('name').trim().isLength({ min: 2 }).withMessage('Space name must be at least 2 characters'),
    body('description').optional().trim(),
    body('cover_image').optional().isURL().withMessage('Cover image must be a valid URL'),
    body('color').optional().matches(/^bg-\w+-\d{3}$/).withMessage('Invalid color format'),
    body('is_private').optional().isBoolean().withMessage('is_private must be boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, cover_image, color = 'bg-blue-500', is_private = false } = req.body;

        const [result] = await pool.execute(
            'INSERT INTO spaces (name, description, cover_image, color, is_private, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description || null, cover_image || null, color, is_private, req.user.id]
        );

        await pool.execute(
            'INSERT INTO user_spaces (user_id, space_id, role) VALUES (?, ?, ?)',
            [req.user.id, result.insertId, 'owner']
        );

        const [spaces] = await pool.execute(`
      SELECT 
        s.*,
        u.name as created_by_name,
        'owner' as user_role,
        1 as member_count
      FROM spaces s
      JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `, [result.insertId]);

        res.status(201).json({
            message: 'Space created successfully',
            space: spaces[0]
        });
    } catch (error) {
        console.error('Create space error:', error);
        res.status(500).json({ message: 'Server error while creating space' });
    }
});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const spaceId = req.params.id;

        const [spaces] = await pool.execute(`
      SELECT 
        s.*,
        u.name as created_by_name,
        COALESCE(us.role, 'none') as user_role,
        us.joined_at,
        (SELECT COUNT(*) FROM user_spaces WHERE space_id = s.id) as member_count
      FROM spaces s
      JOIN users u ON s.created_by = u.id
      LEFT JOIN user_spaces us ON s.id = us.space_id AND us.user_id = ?
      WHERE s.id = ? AND u.is_active = TRUE
    `, [req.user.id, spaceId]);

        if (spaces.length === 0) {
            return res.status(404).json({ message: 'Space not found' });
        }

        const space = spaces[0];

        if (space.is_private && space.user_role === 'none') {
            return res.status(403).json({ message: 'Access denied to private space' });
        }

        res.json({ space });
    } catch (error) {
        console.error('Get space error:', error);
        res.status(500).json({ message: 'Server error while fetching space' });
    }
});

router.put('/:id', authenticate, [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Space name must be at least 2 characters'),
    body('description').optional().trim(),
    body('cover_image').optional().isURL().withMessage('Cover image must be a valid URL'),
    body('color').optional().matches(/^bg-\w+-\d{3}$/).withMessage('Invalid color format'),
    body('is_private').optional().isBoolean().withMessage('is_private must be boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const spaceId = req.params.id;
        const { name, description, cover_image, color, is_private } = req.body;

        const [membership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [req.user.id, spaceId]
        );

        if (membership.length === 0 || !['admin', 'owner'].includes(membership[0].role)) {
            if (!req.user.is_admin) {
                return res.status(403).json({ message: 'Only space administrators can edit this space' });
            }
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (cover_image !== undefined) updates.cover_image = cover_image;
        if (color !== undefined) updates.color = color;
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

        res.json({ message: 'Space updated successfully' });
    } catch (error) {
        console.error('Update space error:', error);
        res.status(500).json({ message: 'Server error while updating space' });
    }
});

router.get('/:id/join-request/me', authenticate, async (req, res) => {
    try {
        const [SS] = await pool.execute("SELECT approved FROM space_requests WHERE user_id = ? AND space_id = ?", [req.user.id, req.params.id])

        if (SS.length === 0) {
            res.status(200).json({ status: 'none' });
        } else {
            res.status(200).json({ status: SS[0].approved ? 'approved' : 'pending' });
        }

    } catch (e) {
        console.error('Read space error:', error);
        res.status(500).json({ message: 'Server error while reading space' });
    }
})


router.post('/:id/join-requests', authenticate, body('message').trim().optional(), async (req, res) => {
    try {
        const spaceId = req.params.id;
        const { message = '' } = req.body;

        const [spaces] = await pool.execute(
            'SELECT created_by FROM spaces WHERE id = ?',
            [spaceId]
        );

        if (spaces.length === 0) {
            return res.status(404).json({ message: 'Space not found' });
        }

        const [existing] = await pool.execute(
            'SELECT id FROM space_requests WHERE user_id = ? AND space_id = ? AND approved = 0',
            [req.user.id, spaceId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Request already pending' });
        }

        await pool.execute(
            'INSERT INTO space_requests (user_id, space_id, message) VALUES (?, ?, ?)',
            [req.user.id, spaceId, message]
        );
        await pool.execute(
            `INSERT INTO notifications (user_id, type, title, content, related_id) VALUES (?, 'space_req', 'Space join request', 'A new member has requested to join your space', ?)`,
            [spaces[0].created_by, spaceId]
        );

        res.json({ message: 'Request sent successfully!!' });
    } catch (e) {
        console.error('Join space error:', error);
        res.status(500).json({ message: 'Server error while requesting space' });
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        const spaceId = req.params.id;

        const [spaces] = await pool.execute(
            'SELECT created_by FROM spaces WHERE id = ?',
            [spaceId]
        );

        if (spaces.length === 0) {
            return res.status(404).json({ message: 'Space not found' });
        }

        if (spaces[0].created_by !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: 'Only space owner or admin can delete this space' });
        }

        await pool.execute('DELETE FROM spaces WHERE id = ?', [spaceId]);

        res.json({ message: 'Space deleted successfully' });
    } catch (error) {
        console.error('Delete space error:', error);
        res.status(500).json({ message: 'Server error while deleting space' });
    }
});

router.delete('/user_spaces/:space_id', authenticate, async (req, res) => {
    try {
        const spaceId = req.params.space_id;
        const userId = req.user.id;

        const [membership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [userId, spaceId]
        );

        if (membership.length === 0) {
            return res.status(404).json({ message: 'Membership not found' });
        }

        if (membership[0].role === 'owner') {
            return res.status(403).json({ message: 'Owner cannot leave' });
        }

        await pool.execute(
            'DELETE FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [userId, spaceId]
        );

        res.json({ message: 'Left space successfully' });
    } catch (error) {
        console.error('Leave space error:', error);
        res.status(500).json({ message: 'Server error while leaving space' });
    }
});

router.post('/:id/join', authenticate, async (req, res) => {
    try {
        const spaceId = req.params.id;

        const [banCheck] = await pool.execute(
            'SELECT * FROM space_bans WHERE space_id = ? AND user_id = ?',
            [spaceId, req.user.id]
        );

        if (banCheck.length > 0) {
            return res.status(403).json({ message: 'You are banned from this space' });
        }

        const [spaces] = await pool.execute(
            'SELECT is_private FROM spaces WHERE id = ?',
            [spaceId]
        );

        if (spaces.length === 0) {
            return res.status(404).json({ message: 'Space not found' });
        }

        const [membership] = await pool.execute(
            'SELECT id FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [req.user.id, spaceId]
        );

        if (membership.length === 0) {
            if (spaces[0].is_private) {
                return res.status(403).json({ message: 'Cannot join private space without invitation' });
            }

            await pool.execute(
                'INSERT INTO user_spaces (user_id, space_id, role) VALUES (?, ?, ?)',
                [req.user.id, spaceId, 'member']
            );
        }

        res.json({ message: 'Space membership updated successfully' });
    } catch (error) {
        console.error('Join space error:', error);
        res.status(500).json({ message: 'Server error during space join operation' });
    }
});

router.get('/:id/members', authenticate, async (req, res) => {
    try {
        const spaceId = req.params.id;

        const [membership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [req.user.id, spaceId]
        );

        if (membership.length === 0 && !req.user.is_admin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const [members] = await pool.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar,
        u.title,
        u.department,
        u.status,
        us.role,
        us.joined_at
      FROM user_spaces us
      JOIN users u ON us.user_id = u.id
      WHERE us.space_id = ? AND u.is_active = TRUE
      ORDER BY 
        CASE us.role 
          WHEN 'owner' THEN 1 
          WHEN 'admin' THEN 2 
          ELSE 3 
        END,
        us.joined_at ASC
    `, [spaceId]);

        res.json({ members });
    } catch (error) {
        console.error('Get space members error:', error);
        res.status(500).json({ message: 'Server error while fetching space members' });
    }
});

router.post('/:id/invite', authenticate, [
    body('user_id').isInt().withMessage('Valid user ID is required'),
    body('role').optional().isIn(['member', 'admin']).withMessage('Invalid role')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const spaceId = req.params.id;
        const { user_id, role = 'member' } = req.body;

        const [banCheck] = await pool.execute(
            'SELECT id FROM space_bans WHERE space_id = ? AND user_id = ?',
            [spaceId, user_id]
        );

        if (banCheck.length > 0) {
            return res.status(403).json({ message: 'User is banned from this space' });
        }


        const [membership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [req.user.id, spaceId]
        );

        if (membership.length === 0 || !['admin', 'owner'].includes(membership[0].role)) {
            if (!req.user.is_admin) {
                return res.status(403).json({ message: 'Only space administrators can invite users' });
            }
        }

        const [users] = await pool.execute(
            'SELECT id FROM users WHERE id = ? AND is_active = TRUE',
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const [existingMembership] = await pool.execute(
            'SELECT id FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [user_id, spaceId]
        );

        if (existingMembership.length > 0) {
            return res.status(400).json({ message: 'User is already a member of this space' });
        }

        await pool.execute(
            'INSERT INTO user_spaces (user_id, space_id, role) VALUES (?, ?, ?)',
            [user_id, spaceId, role]
        );

        await pool.execute(
            `INSERT INTO notifications (user_id, type, title, content, related_id) 
       VALUES (?, ?, ?, ?, ?)`,
            [user_id, 'space', 'Space Invitation', `You've been added to a space by ${req.user.name}`, spaceId]
        );

        res.json({ message: 'User invited to space successfully' });
    } catch (error) {
        console.error('Invite user error:', error);
        res.status(500).json({ message: 'Server error while inviting user' });
    }
});

router.put('/:id/members/:userId', authenticate, [
    body('role').isIn(['member', 'admin']).withMessage('Invalid role')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const spaceId = req.params.id;
        const targetUserId = req.params.userId;
        const { role } = req.body;

        const [membership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [req.user.id, spaceId]
        );

        if (membership.length === 0 || membership[0].role !== 'owner') {
            if (!req.user.is_admin) {
                return res.status(403).json({ message: 'Only space owner can change roles' });
            }
        }

        const [result] = await pool.execute(
            'UPDATE user_spaces SET role = ? WHERE user_id = ? AND space_id = ?',
            [role, targetUserId, spaceId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }

        res.json({ message: 'Member role updated' });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ message: 'Server error while updating role' });
    }
});

router.delete('/:spaceId/members/:userId', authenticate, async (req, res) => {
    try {
        const spaceId = req.params.spaceId;
        const targetUserId = req.params.userId;

        const [membership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [req.user.id, spaceId]
        );

        if (membership.length === 0 || !['admin', 'owner'].includes(membership[0].role)) {
            if (!req.user.is_admin) {
                return res.status(403).json({ message: 'Only administrators can remove members' });
            }
        }

        const [target] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [targetUserId, spaceId]
        );

        if (target.length === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (target[0].role === 'owner') {
            return res.status(400).json({ message: 'Cannot remove space owner' });
        }

        await pool.execute(
            'DELETE FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [targetUserId, spaceId]
        );

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Server error while removing member' });
    }
});

router.put('/:spaceId/members/:userId/promote', authenticate, async (req, res) => {
    try {
        const spaceId = req.params.spaceId;
        const targetUserId = req.params.userId;
        const currentUserId = req.user.id;

        await pool.query('START TRANSACTION');

        const [owner] = await pool.execute(
            `SELECT user_id 
             FROM user_spaces 
             WHERE space_id = ? AND role = 'owner'`,
            [spaceId]
        );

        if (owner.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Space owner not found' });
        }

        if (owner[0].user_id !== currentUserId) {
            await pool.query('ROLLBACK');
            return res.status(403).json({ message: 'Only owner can promote members' });
        }

        const [target] = await pool.execute(
            'SELECT role FROM user_spaces WHERE space_id = ? AND user_id = ?',
            [spaceId, targetUserId]
        );

        if (target.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Target user not in space' });
        }

        if (targetUserId === currentUserId) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: 'User is already owner' });
        }

        await pool.execute(
            `UPDATE user_spaces SET role = 'admin' 
             WHERE space_id = ? AND user_id = ?`,
            [spaceId, currentUserId]
        );

        await pool.execute(
            `UPDATE user_spaces SET role = 'owner' 
             WHERE space_id = ? AND user_id = ?`,
            [spaceId, targetUserId]
        );

        await pool.query('COMMIT');
        res.json({ message: 'User promoted to owner' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Promote error:', error);
        res.status(500).json({ message: 'Server error during promotion' });
    }
});

router.get('/:spaceId/banned', authenticate, async (req, res) => {
    try {
        const [bans] = await pool.execute(
            `SELECT u.*
             FROM space_bans sb
             JOIN users u ON sb.user_id = u.id
             WHERE sb.space_id = ?`,
            [req.params.spaceId]
        );

        return res.json({ bans });
    } catch (err) {
        console.error('Error fetching banned users:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


router.post('/:spaceId/ban', authenticate, [
    body('user_id').isInt().withMessage('Valid user ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const spaceId = req.params.spaceId;
        const userId = req.body.user_id;
        const currentUserId = req.user.id;

        try {
            const [existingBan] = await pool.execute(
                'SELECT id FROM space_bans WHERE space_id = ? AND user_id = ?',
                [spaceId, userId]
            );

            if (existingBan.length > 0) {
                return res.status(400).json({ message: 'User is already banned' });
            }
        } catch { }

        await pool.query('START TRANSACTION');

        const [membership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [currentUserId, spaceId]
        );

        if (membership.length === 0 || !['admin', 'owner'].includes(membership[0].role)) {
            await pool.query('ROLLBACK');
            if (!req.user.is_admin) {
                return res.status(403).json({ message: 'Only administrators can ban users' });
            }
        }

        if (userId === currentUserId) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: 'Cannot ban yourself' });
        }

        const [ownerCheck] = await pool.execute(
            `SELECT user_id FROM user_spaces 
             WHERE space_id = ? AND user_id = ? AND role = 'owner'`,
            [spaceId, userId]
        );

        if (ownerCheck.length > 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: 'Cannot ban space owner' });
        }

        await pool.execute(
            'DELETE FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [userId, spaceId]
        );

        await pool.execute(
            `INSERT INTO space_bans (space_id, user_id, banned_by) 
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE banned_at = CURRENT_TIMESTAMP`,
            [spaceId, userId, currentUserId]
        );

        await pool.query('COMMIT');
        res.json({ message: 'User banned successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Ban error:', error);
        res.status(500).json({ message: 'Server error during ban' });
    }
});

router.post('/:spaceId/unban', authenticate, [
    body('user_id').isInt().withMessage('Valid user ID is required')
], async (req, res) => {
    try {
        const spaceId = req.params.spaceId;
        const userId = req.body.user_id;
        const currentUserId = req.user.id;

        const [membership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [currentUserId, spaceId]
        );

        if (membership.length === 0 || !['admin', 'owner'].includes(membership[0].role)) {
            if (!req.user.is_admin) {
                return res.status(403).json({ message: 'Only administrators can unban users' });
            }
        }

        const [result] = await pool.execute(
            'DELETE FROM space_bans WHERE space_id = ? AND user_id = ?',
            [spaceId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Ban record not found' });
        }

        res.json({ message: 'User unbanned successfully' });
    } catch (error) {
        console.error('Unban error:', error);
        res.status(500).json({ message: 'Server error during unban' });
    }
});

router.put('/:id/members/:userId', authenticate, [
    body('role').isIn(['member', 'admin']).withMessage('Invalid role')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id: spaceId, userId: targetUserId } = req.params;
        const { role } = req.body;

        const [membership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [req.user.id, spaceId]
        );

        if (membership.length === 0 || membership[0].role !== 'owner') {
            if (!req.user.is_admin) {
                return res.status(403).json({ message: 'Only space owner can change member roles' });
            }
        }

        const [result] = await pool.execute(
            'UPDATE user_spaces SET role = ? WHERE user_id = ? AND space_id = ?',
            [role, targetUserId, spaceId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Member not found in this space' });
        }

        res.json({ message: 'Member role updated successfully' });
    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ message: 'Server error while updating member role' });
    }
});

router.delete('/:id/members/:userId', authenticate, async (req, res) => {
    try {
        const { id: spaceId, userId: targetUserId } = req.params;

        const [membership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [req.user.id, spaceId]
        );

        if (membership.length === 0 || !['admin', 'owner'].includes(membership[0].role)) {
            if (!req.user.is_admin) {
                return res.status(403).json({ message: 'Only space administrators can remove members' });
            }
        }

        const [targetMembership] = await pool.execute(
            'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [targetUserId, spaceId]
        );

        if (targetMembership.length === 0) {
            return res.status(404).json({ message: 'User is not a member of this space' });
        }

        if (targetMembership[0].role === 'owner') {
            return res.status(400).json({ message: 'Cannot remove space owner' });
        }

        await pool.execute(
            'DELETE FROM user_spaces WHERE user_id = ? AND space_id = ?',
            [targetUserId, spaceId]
        );

        res.json({ message: 'Member removed from space successfully' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Server error while removing member' });
    }
});

module.exports = router;