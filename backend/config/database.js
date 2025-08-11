const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'yahh_user',
  password: process.env.DB_PASSWORD || 'yahh_password',
  database: process.env.DB_NAME || 'yahh_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);

const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(500) DEFAULT NULL,
        title VARCHAR(255) DEFAULT NULL,
        department VARCHAR(255) DEFAULT NULL,
        bio TEXT DEFAULT NULL,
        status ENUM('online', 'away', 'offline') DEFAULT 'offline',
        is_moderator BOOLEAN DEFAULT FALSE,
        is_suspended BOOLEAN DEFAULT FALSE,
        suspension_reason TEXT DEFAULT NULL,
        suspension_end DATETIME DEFAULT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS spaces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cover_image VARCHAR(500) DEFAULT NULL,
        color VARCHAR(50) DEFAULT 'bg-blue-500',
        is_private BOOLEAN DEFAULT FALSE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_spaces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        space_id INT NOT NULL,
        role ENUM('member', 'admin', 'owner') DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_space (user_id, space_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        space_id INT DEFAULT NULL,
        flag_count INT DEFAULT 0,
        content TEXT NOT NULL,
        image VARCHAR(500) DEFAULT NULL,
        type ENUM('post', 'thread') DEFAULT 'post',
        is_pinned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        parent_id INT DEFAULT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        post_id INT DEFAULT NULL,
        comment_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        UNIQUE KEY unique_post_like (user_id, post_id),
        UNIQUE KEY unique_comment_like (user_id, comment_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) DEFAULT NULL,
        is_group BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id CHAR(36) NOT NULL,
        user_id INT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_participant (conversation_id, user_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id CHAR(36) NOT NULL,
        sender_id INT NOT NULL,
        content TEXT NOT NULL,
        attachements TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('like', 'comment', 'message', 'space', 'mention', 'event') NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        related_id INT DEFAULT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS follows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_id INT NOT NULL,
        following_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_follow (follower_id, following_id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        start DATETIME NOT NULL,
        end DATETIME NOT NULL,
        isPrivate BOOLEAN DEFAULT FALSE,
        creator_id INT,
        FOREIGN KEY (creator_id) REFERENCES users(id)
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS event_mentions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        user_id INT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS message_recipients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        user_id INT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_message_recipient (message_id, user_id)
      )
    `);

    await pool.execute(`
  CREATE TABLE IF NOT EXISTS message_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    url VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type ENUM('image', 'video', 'file') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
  )
`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS post_spaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    space_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
    UNIQUE KEY unique_post_space (post_id, space_id)
);`)

    await pool.execute(`CREATE TABLE IF NOT EXISTS post_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  url VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type ENUM('image', 'video', 'file') DEFAULT 'image',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
)`)

    await pool.execute(`CREATE TABLE IF NOT EXISTS space_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  space_id INT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`)

    await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
  user_id INT PRIMARY KEY,
  theme VARCHAR(10) NOT NULL DEFAULT 'light',
  notifications BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  font_size VARCHAR(10) NOT NULL DEFAULT 'medium',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
  `);


    await pool.execute(`
  CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) DEFAULT NULL,
    target_id INT DEFAULT NULL,
    details TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

    await pool.execute(`
  CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

    await pool.execute(`
  CREATE TABLE IF NOT EXISTS post_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS space_bans (
    space_id INT NOT NULL,
    user_id INT NOT NULL,
    banned_by INT NOT NULL,
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (space_id, user_id),
    FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE CASCADE
);`)

    const [adminExists] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@yahh.local']
    );

    if (adminExists.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);

      await pool.execute(`
        INSERT INTO users (name, email, password, title, department, is_admin, email_verified, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'yahh Admin',
        'admin@yahh.local',
        hashedPassword,
        'System Administrator',
        'IT Department',
        true,
        true,
        '/uploads/default_pfp.png'
      ]);

      console.log('✅ Default admin user created (admin@yahh.local / admin123)');
    }

    const sampleUsers = [
      {
        name: 'John Smith',
        email: 'john.smith@company.com',
        password: await require('bcryptjs').hash('password123', 12),
        title: 'Senior Developer',
        department: 'Engineering',
        avatar: '/uploads/default_pfp.png'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        password: await require('bcryptjs').hash('password123', 12),
        title: 'Product Manager',
        department: 'Product',
        avatar: '/uploads/default_pfp.png'
      },
      {
        name: 'Mike Chen',
        email: 'mike.chen@company.com',
        password: await require('bcryptjs').hash('password123', 12),
        title: 'UX Designer',
        department: 'Design',
        avatar: '/uploads/default_pfp.png'
      }
    ];

    for (const user of sampleUsers) {
      const [userExists] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );

      if (userExists.length === 0) {
        await pool.execute(`
          INSERT INTO users (name, email, password, title, department, email_verified, avatar)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [user.name, user.email, user.password, user.title, user.department, true, user.avatar]);
      }
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

module.exports = { pool, initDatabase };