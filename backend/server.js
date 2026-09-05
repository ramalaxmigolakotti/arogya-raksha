const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const ioInstance = require('./ioInstance');

// Gzip compression — reduces response sizes by 60-80%
app.use(compression());

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (origin === 'http://localhost:3000' || origin === process.env.FRONTEND_URL || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
  },
});
// Register io singleton immediately so routes can access it
ioInstance.setIo(io);

// Security middleware
app.use(helmet());
app.use(morgan('dev'));

// General API limiter — generous enough for normal app usage
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 requests per 15 min per IP (was 100 — too low for SPAs)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Strict limiter for auth endpoints only (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 auth attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

// Body parsing
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    // Also allow any *.vercel.app preview deploys
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const hospitalRoutes = require('./routes/hospitals');
const reportRoutes = require('./routes/reports');
const medicineRoutes = require('./routes/medicines');
const aiRoutes = require('./routes/ai');
const emergencyRoutes = require('./routes/emergency');
const bloodDonorRoutes = require('./routes/bloodDonors');
const chatRoutes = require('./routes/chat');
const orderRoutes = require('./routes/orders');
const healthRoutes = require('./routes/health');

const doctorProfileRoutes = require('./routes/doctorProfiles');
const medicalProfileRoutes = require('./routes/medicalProfile');
const notificationRoutes = require('./routes/notifications');
const whatsappRoutes = require('./routes/whatsapp');
const predictRoutes = require('./routes/predict');

// Preload all 9 predictor datasets into memory
require('./services/predictorDatasets').loadAll();

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/blood-donors', bloodDonorRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/health', healthRoutes);

app.use('/api/doctor-profiles', doctorProfileRoutes);
app.use('/api/medical-profile', medicalProfileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/predict', predictRoutes);

// Health check
const { redisHealth } = require('./services/redisService');
app.get('/api/health', async (req, res) => {
  const redis = await redisHealth();
  res.json({
    status: 'ok',
    message: 'Arogya Raksha API is running',
    database: 'Supabase (PostgreSQL)',
    cache: `Redis (${redis.status})`,
  });
});

// Socket.io — chat + telemedicine
require('./services/socketService')(io);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start server (Supabase client connects automatically, no need to await DB connection)
const PORT = process.env.PORT || 5000;

// Verify Supabase connection
const supabase = require('./supabaseClient');
supabase
  .from('users')
  .select('id', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) {
      console.warn('⚠️  Supabase connection issue:', error.message);
      console.warn('   Make sure tables are created via schema.sql');
    } else {
      console.log('✅ Connected to Supabase (PostgreSQL)');
    }
  })
  .catch((err) => {
    console.warn('⚠️  Supabase check failed:', err.message);
  });

// Verify Redis connection
redisHealth().then((r) => {
  if (r.status === 'connected') {
    console.log('✅ Connected to Redis Cloud');
  } else {
    console.warn('⚠️  Redis not connected — caching disabled');
  }
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Arogya Raksha API running on port ${PORT}`);
});

module.exports = { app, io };
