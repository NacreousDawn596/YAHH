const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [settings] = await pool.execute(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [req.user.id]
    );

    if (settings.length === 0) {
      const defaultSettings = {
        theme: 'light',
        notifications: true,
        email_notifications: true,
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        font_size: 'medium'
      };

      await pool.execute(
        'INSERT INTO user_settings (user_id, theme, notifications, email_notifications, language, timezone, font_size) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          req.user.id,
          defaultSettings.theme,
          defaultSettings.notifications,
          defaultSettings.email_notifications,
          defaultSettings.language,
          defaultSettings.timezone,
          defaultSettings.font_size
        ]
      );

      const [newSettings] = await pool.execute(
        'SELECT * FROM user_settings WHERE user_id = ?',
        [req.user.id]
      );

      return res.json({ settings: newSettings[0] });
    }

    res.json({ settings: settings[0] });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error while fetching settings' });
  }
});

router.put('/', authenticate, [
  body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Invalid theme'),
  body('notifications').optional().isBoolean().withMessage('Notifications must be boolean'),
  body('email_notifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('language').optional().isIn(['en', 'es', 'fr', 'de']).withMessage('Invalid language'),
  body('timezone').optional().isIn([
    'UTC', 'America/New_York', 'America/Chicago',
    'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Asia/Tokyo',
    'Africa/Casablanca'
  ]).withMessage('Invalid timezone'),
  body('font_size').optional().isIn(['small', 'medium', 'large']).withMessage('Invalid font size')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      theme,
      notifications,
      email_notifications,
      language,
      timezone,
      font_size
    } = req.body;

    const userId = req.user.id;

    const updateFields = [];
    const updateValues = [];

    if (theme !== undefined) {
      updateFields.push('theme = ?');
      updateValues.push(theme);
    }

    if (notifications !== undefined) {
      updateFields.push('notifications = ?');
      updateValues.push(notifications);
    }

    if (email_notifications !== undefined) {
      updateFields.push('email_notifications = ?');
      updateValues.push(email_notifications);
    }

    if (language !== undefined) {
      updateFields.push('language = ?');
      updateValues.push(language);
    }

    if (timezone !== undefined) {
      updateFields.push('timezone = ?');
      updateValues.push(timezone);
    }

    if (font_size !== undefined) {
      updateFields.push('font_size = ?');
      updateValues.push(font_size);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateValues.push(userId);

    await pool.execute(
      `UPDATE user_settings SET ${updateFields.join(', ')} WHERE user_id = ?`,
      updateValues
    );

    const [settings] = await pool.execute(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );

    res.json({
      message: 'Settings updated successfully',
      settings: settings[0]
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error while updating settings' });
  }
});

module.exports = router;