const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const { space_id, user_id = req.user.id, limit = 10, offset = 0, type = 'all' } = req.query;

        [urelated] = await pool.execute(`select * from user_spaces WHERE user_id = ?`, [req.user.id])

        spacePlaceholders = urelated.map((s) => s.space_id).join(", ") || 0

        let query = `
SELECT 
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
WHERE ((s.is_private = FALSE AND s.id IN (${spacePlaceholders}))  OR s.is_private IS NULL)
`;

        const params = [req.user.id];

        if (space_id) {
            query += ` AND ( p.space_id = ? OR p.id IN (
            SELECT ps.post_id 
            FROM post_spaces ps 
            WHERE ps.space_id = ?
        ))`;
            params.push(space_id);
            params.push(space_id);
        }

        if (type === 'pinned') {
            query += ` AND p.is_pinned = TRUE`;
        }

        query += ` ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));


        [posts] = await pool.execute(query, params);

        try {
            const postIds = posts.map(post => post.id);

            const [postSpaceRows] = await pool.execute(
                `SELECT post_id, space_id FROM post_spaces WHERE post_id IN (?)`,
                [postIds]
            );

            const spaceIdsByPost = {};
            postSpaceRows.forEach(row => {
                if (!spaceIdsByPost[row.post_id]) {
                    spaceIdsByPost[row.post_id] = [];
                }
                spaceIdsByPost[row.post_id].push(row.space_id);
            });

            const allSpaceIds = [...new Set(postSpaceRows.map(row => row.space_id))];

            let spacesMap = {};
            if (allSpaceIds.length > 0) {
                const [spaces] = await pool.execute(
                    `SELECT id, name, color FROM spaces WHERE id IN (?)`,
                    [allSpaceIds]
                );
                spaces.forEach(space => {
                    spacesMap[space.id] = space;
                });
            }

            posts = posts.map(post => {
                post.spaces = (spaceIdsByPost[post.id] || [])
                    .map(spaceId => spacesMap[spaceId])
                    .filter(space => space); // Filter out any undefined
                return post;
            });
        } catch {
            posts = posts.map((post) => {
                post.spaces = []
                return post
            })
        }

        res.json({ posts });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ message: 'Server error while fetching posts' });
    }
});

router.post('/', authenticate, [
    body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
    body('space_ids').isArray().withMessage('Space IDs must be an array'),
    body('space_ids.*').isInt().withMessage('Invalid space ID'),
    body('images').optional().isArray().withMessage('Images must be an array'),
    body('type').optional().isIn(['post', 'thread']).withMessage('Invalid post type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { content, space_ids, images = [], type = 'post' } = req.body;

        const spaceChecks = space_ids.map(spaceId =>
            pool.execute(
                'SELECT id FROM user_spaces WHERE user_id = ? AND space_id = ?',
                [req.user.id, spaceId]
            )
        );

        const results = await Promise.all(spaceChecks);
        const allValid = results.every(([rows]) => rows.length > 0);

        if (!allValid) {
            return res.status(403).json({ message: 'You are not a member of one or more spaces' });
        }

        await pool.execute('START TRANSACTION');

        try {
            const [postResult] = await pool.execute(
                'INSERT INTO posts (user_id, content, type, image) VALUES (?, ?, ?, ?)',
                [req.user.id, content, type, JSON.stringify(images)]
            );

            const postId = postResult.insertId;

            const spaceInserts = space_ids.map(spaceId =>
                pool.execute(
                    'INSERT INTO post_spaces (post_id, space_id) VALUES (?, ?)',
                    [postId, spaceId]
                )
            );
            await Promise.all(spaceInserts);

            if (images.length > 0) {
                const values = images.map(url => [postId, url, url.split("/").reverse()[0]]);
                await pool.query(
                    'INSERT INTO post_attachments (post_id, url, file_name) VALUES ?',
                    [values]
                );
            }

            await pool.execute('COMMIT');

            const [posts] = await pool.execute(`
                SELECT 
                    p.*,
                    u.name AS user_name,
                    u.avatar AS user_avatar,
                    u.title AS user_title,
                    u.department AS user_department,
                    COALESCE(
                        JSON_ARRAYAGG(
                            JSON_OBJECT('id', s.id, 'name', s.name, 'color', s.color)
                        ), 
                        JSON_ARRAY()
                    ) AS spaces,
                    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
                    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
                    FALSE AS user_liked
                FROM posts p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN post_spaces ps ON p.id = ps.post_id
                LEFT JOIN spaces s ON ps.space_id = s.id
                WHERE p.id = ?
                GROUP BY p.id
            `, [postId]);

            if (space_ids.length > 0) {
                const io = req.app.get('io');
                space_ids.forEach(spaceId => {
                    io.to(`space-${spaceId}`).emit('new-post', posts[0]);
                });
            }

            [spaces] = await space_ids.map(async (e) => await pool.execute("SELECT id, name FROM spaces WHERE id = ?", [e]))
            posts[0].spaces = spaces

            res.status(201).json({
                message: 'Post created successfully',
                post: posts[0]
            });
        } catch (error) {
            await pool.execute('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ message: 'Server error while creating post' });
    }
});





router.get('/tags', authenticate, async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.json({ tags: [] });
        }

        const [tags] = await pool.execute(
            `SELECT name, id
             FROM spaces 
             WHERE name LIKE ?
             LIMIT 5`,
            [`${query}%`]
        );

        res.json({ tags });
    } catch (error) {
        console.error('Hashtag search error:', error);
        res.status(500).json({ message: 'Server error while searching hashtags' });
    }
});

router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const postId = req.params.id;

        const [posts] = await pool.execute(`
            SELECT 
                p.*,
                u.name AS user_name,
                u.avatar AS user_avatar,
                u.title AS user_title,
                u.department AS user_department,
                COALESCE(
                    JSON_ARRAYAGG(
                        JSON_OBJECT('id', s.id, 'name', s.name, 'color', s.color)
                    ), 
                    JSON_ARRAY()
                ) AS spaces,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
                ${req.user ? 'EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS user_liked' : 'FALSE AS user_liked'},
                COALESCE(JSON_ARRAYAGG(pi.url), JSON_ARRAY()) AS images
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN post_spaces ps ON p.id = ps.post_id
            LEFT JOIN spaces s ON ps.space_id = s.id
            LEFT JOIN post_attachments pi ON p.id = pi.post_id
            WHERE p.id = ? AND u.is_active = TRUE
            GROUP BY p.id
        `, req.user ? [req.user.id, postId] : [postId]);

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json({ post: posts[0] });
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ message: 'Server error while fetching post' });
    }
});

router.put('/:id', authenticate, [
    body('content').optional().trim().isLength({ min: 1 }).withMessage('Content cannot be empty'),
    body('image').optional().isURL().withMessage('Image must be a valid URL')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const postId = req.params.id;
        const { content, image } = req.body;

        const [posts] = await pool.execute(
            'SELECT user_id FROM posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (posts[0].user_id !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: 'Not authorized to edit this post' });
        }

        const updates = {};
        if (content !== undefined) updates.content = content;
        if (image !== undefined) updates.image = image;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const params = [...Object.values(updates), postId];

        await pool.execute(
            `UPDATE posts SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );

        res.json({ message: 'Post updated successfully' });
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({ message: 'Server error while updating post' });
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        const postId = req.params.id;

        const [posts] = await pool.execute(
            'SELECT user_id, space_id FROM posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (posts[0].user_id !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        await pool.execute('DELETE FROM posts WHERE id = ?', [postId]);

        if (posts[0].space_id) {
            const io = req.app.get('io');
            io.to(`space-${posts[0].space_id}`).emit('post-deleted', { postId });
        }

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ message: 'Server error while deleting post' });
    }
});

router.post('/:id/like', authenticate, async (req, res) => {
    try {
        const postId = req.params.id;

        const [posts] = await pool.execute(
            'SELECT user_id FROM posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const [existingLike] = await pool.execute(
            'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
            [req.user.id, postId]
        );

        if (existingLike.length > 0) {
            await pool.execute(
                'DELETE FROM likes WHERE user_id = ? AND post_id = ?',
                [req.user.id, postId]
            );

            res.json({ message: 'Post unliked', liked: false });
        } else {
            await pool.execute(
                'INSERT INTO likes (user_id, post_id) VALUES (?, ?)',
                [req.user.id, postId]
            );

            if (posts[0].user_id !== req.user.id) {
                await pool.execute(
                    `INSERT INTO notifications (user_id, type, title, content, related_id) 
           VALUES (?, ?, ?, ?, ?)`,
                    [posts[0].user_id, 'like', 'Post Liked', `${req.user.name} liked your post`, postId]
                );
            }

            res.json({ message: 'Post liked', liked: true });
        }
    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({ message: 'Server error while liking post' });
    }
});

router.post('/:id/pin', authenticate, async (req, res) => {
    try {
        const postId = req.params.id;

        const [posts] = await pool.execute(
            'SELECT space_id, is_pinned FROM posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const post = posts[0];

        if (!req.user.is_admin) {
            if (!post.space_id) {
                return res.status(403).json({ message: 'Cannot pin posts outside of spaces' });
            }

            const [membership] = await pool.execute(
                'SELECT role FROM user_spaces WHERE user_id = ? AND space_id = ?',
                [req.user.id, post.space_id]
            );

            if (membership.length === 0 || !['admin', 'owner'].includes(membership[0].role)) {
                return res.status(403).json({ message: 'Only space administrators can pin posts' });
            }
        }

        const newPinStatus = !post.is_pinned;

        await pool.execute(
            'UPDATE posts SET is_pinned = ? WHERE id = ?',
            [newPinStatus, postId]
        );

        res.json({
            message: newPinStatus ? 'Post pinned successfully' : 'Post unpinned successfully',
            pinned: newPinStatus
        });
    } catch (error) {
        console.error('Pin post error:', error);
        res.status(500).json({ message: 'Server error while pinning post' });
    }
});

module.exports = router;