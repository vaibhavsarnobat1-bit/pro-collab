const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const roomRoutes = require('./routes/roomRoutes');
const fileSystemRoutes = require('./routes/fileSystemRoutes');
const aiRoutes = require('./routes/aiRoutes');
const setupSocketHandlers = require('./socket/socketHandler');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS for client web applications
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:3000']
  : ['*'];

app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Initialize Database connection
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/fs', fileSystemRoutes);
app.use('/api/ai', aiRoutes);

// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Pro-Collab Server Running Smoothly' });
});

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, 'http://localhost:3000'] : '*',
    methods: ['GET', 'POST']
  }
});

// Attach socket handlers
setupSocketHandlers(io, app);

// Serve React Frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  // SPA catch-all — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Pro-Collab Server listening on port: ${PORT}`);
  console.log(`====================================================`);
});
