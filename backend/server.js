const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const spaceRoutes = require('./routes/spaces');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const eventRoutes = require('./routes/events');
const upload = require('./routes/upload');
const settings = require('./routes/settings');
const { initDatabase } = require('./config/database');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
});


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1000, 
    message: 'Too many requests from this IP, please try again later.'
});

app.use(helmet({
    crossOriginResourcePolicy: false,
}));
const allowedOrigins = [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'http://localhost:3001', 
    'http://127.0.0.1:3001',
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

io.on('connection', (socket) => {
    socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
    });

    socket.on('disconnect', () => {
    });
});
app.set('io', io);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts', commentRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', upload);
app.use('/api/settings', settings);

app.get('/api/', (req, res) => {
    res.json({
        message: 'yahh Clone API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 8001;

initDatabase().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 yahh Clone Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

module.exports = app;