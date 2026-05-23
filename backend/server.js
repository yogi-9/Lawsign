'use strict';

/**
 * server.js — Entry Point
 *
 * Boot sequence (ORDER MATTERS):
 *  1.  Load .env
 *  2.  Connect MongoDB  → exit on failure
 *  3.  Init upload directories
 *  4.  Create Express app
 *  5.  Security: helmet
 *  6.  Security: CORS
 *  7.  Parsing: cookie-parser, json body, urlencoded
 *  8.  Logger: morgan (dev only)
 *  9.  Global rate limit
 *  10. Mount API routes
 *  11. Health check route
 *  12. 404 handler
 *  13. Global error handler (must be LAST middleware)
 *  14. Create raw HTTP server
 *  15. Attach Socket.io to raw HTTP server
 *  16. Socket.io auth middleware
 *  17. Store io instance in config/socket.js singleton
 *  18. Start listening
 */

// ── 1. Environment variables ───────────────────────────────────────────────────
require('dotenv').config();

const express      = require('express');
const http         = require('http');
const { Server: SocketServer } = require('socket.io');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');
const passport     = require('./config/passport');

// Internal modules
const connectDB          = require('./config/db');
const { getConnectionState } = require('./config/db');
const { setIO }          = require('./config/socket');
const { initUploadDirs } = require('./services/storage.service');
const { generalLimiter } = require('./middleware/rateLimit');
const errorHandler       = require('./middleware/errorHandler');
const { verifyToken }    = require('./utils/jwt');
const { COOKIE_NAME }    = require('./config/constants');

// Routes
const authRoutes      = require('./routes/auth.routes');
const documentRoutes  = require('./routes/document.routes');
const signatureRoutes = require('./routes/signature.routes');
const outputRoutes    = require('./routes/output.routes');
const auditRoutes     = require('./routes/audit.routes');

// ─────────────────────────────────────────────────────────────────────────────
async function startServer() {
  // ── 2. Database ─────────────────────────────────────────────────────────────
  await connectDB(); // calls process.exit(1) on failure

  // ── 3. Upload directories ───────────────────────────────────────────────────
  initUploadDirs();

  // ── 4. Express app ──────────────────────────────────────────────────────────
  const app = express();

  // ── 5. Helmet — security HTTP headers ────────────────────────────────────────
  const isProd = process.env.NODE_ENV === 'production';
  
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for UI components
        connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:5173", "ws://localhost:5000", "wss://localhost:5000"],
      },
    },
    hsts: isProd ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false, // Never set HSTS in dev
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xFrameOptions: { action: 'sameorigin' },
  }));

  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // ── 6. CORS — allow frontend to talk to this API ─────────────────────────────
  app.use(cors({
    origin        : process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials   : true,    // required for cookies to be sent cross-origin
    methods       : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ── 7. Body & cookie parsing ──────────────────────────────────────────────────
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── 8. HTTP logger (dev only) ─────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  // ── 9. Global rate limit ──────────────────────────────────────────────────────
  app.use(generalLimiter);

  // ── Initialize Passport ───────────────────────────────────────────────────────
  app.use(passport.initialize());

  // ── 10. API routes ────────────────────────────────────────────────────────────
  app.use('/api/v1/auth',       authRoutes);
  app.use('/api/v1/documents',  documentRoutes);
  app.use('/api/v1/signatures', signatureRoutes);
  app.use('/api/v1/output',     outputRoutes);
  app.use('/api/v1/audit',      auditRoutes);

  // ── 11. Health check ──────────────────────────────────────────────────────────
  app.get('/api/v1/health', async (_req, res) => {
    const dbState = getConnectionState();
    const memUsage = process.memoryUsage();

    // Measure DB ping time
    let dbPingMs = null;
    try {
      const start = Date.now();
      await require('mongoose').connection.db.admin().ping();
      dbPingMs = Date.now() - start;
    } catch {
      dbPingMs = -1; // indicates ping failed
    }

    const isHealthy = dbState.readyState === 1;

    res.status(isHealthy ? 200 : 503).json({
      success  : isHealthy,
      message  : isHealthy ? 'LawSign API is operational.' : 'LawSign API is degraded — database unavailable.',
      timestamp: new Date().toISOString(),
      env      : process.env.NODE_ENV || 'development',
      version  : '1.0.0',
      uptime   : Math.floor(process.uptime()),
      database : {
        status   : dbState.status,
        host     : dbState.host,
        name     : dbState.name,
        pingMs   : dbPingMs,
      },
      memory: {
        rss     : `${(memUsage.rss / 1024 / 1024).toFixed(1)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
      },
    });
  });

  // ── 12. 404 — catch-all for unmatched routes ──────────────────────────────────
  app.use((_req, res) => res.status(404).json({
    success: false,
    error  : 'Route not found. Check the API documentation.',
  }));

  // ── 13. Global error handler — MUST be last middleware ────────────────────────
  app.use(errorHandler);

  // ── 14. Raw HTTP server ───────────────────────────────────────────────────────
  // Socket.io needs the raw Node http.Server, not the Express app wrapper
  const server = http.createServer(app);

  // ── 15. Socket.io ─────────────────────────────────────────────────────────────
  const io = new SocketServer(server, {
    cors: {
      origin     : process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    // Send ping every 25s, disconnect after 60s no response
    pingInterval: 25000,
    pingTimeout : 60000,
  });

  // ── 16. Socket.io auth middleware ─────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie || '';

      // Try to extract JWT token from cookie
      const tokenCookie = cookieHeader
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('lawsign_token='));

      const token = socket.handshake.auth?.token ||
        (tokenCookie ? tokenCookie.split('=').slice(1).join('=') : null);

      if (token) {
        // Authenticated user — verify JWT and join userId room
        const decoded = verifyToken(token);
        socket.userId = decoded.userId;
        socket.guestSessionId = null;
        return next();
      }

      // No JWT — check for guest cookie
      const guestCookie = cookieHeader
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('lawsign_guest='));

      if (guestCookie) {
        const guestId = guestCookie.split('=').slice(1).join('=');
        socket.userId = null;
        socket.guestSessionId = guestId;
        return next();
      }

      // No credentials at all — reject
      return next(new Error('Socket: authentication required'));

    } catch {
      return next(new Error('Socket: invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.userId) {
      socket.join(socket.userId);
      console.log(`Socket connected — user ${socket.userId}`);
    } else if (socket.guestSessionId) {
      socket.join(`guest:${socket.guestSessionId}`);
      console.log(`Socket connected — guest ${socket.guestSessionId}`);
    }

    socket.on('disconnect', (reason) => {
      const id = socket.userId || socket.guestSessionId;
      console.log(`Socket disconnected — ${id} (${reason})`);
    });
  });

  // ── 17. Register io singleton ────────────────────────────────────────────────
  setIO(io); // makes getIO() available to output.controller

  // ── 18. Start listening ───────────────────────────────────────────────────────
  const PORT = parseInt(process.env.PORT, 10) || 5000;

  server.listen(PORT, () => {
    const env = process.env.NODE_ENV || 'development';
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║        🖋  LawSign Backend API  v1.0          ║');
    console.log(`║  Port : ${PORT}                                   ║`);
    console.log(`║  Env  : ${env.padEnd(38)}║`);
    console.log(`║  CORS : ${(process.env.FRONTEND_URL || 'http://localhost:5173').padEnd(37)}║`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  Routes:                                     ║');
    console.log(`║  POST  /api/v1/auth/register                 ║`);
    console.log(`║  POST  /api/v1/auth/login                    ║`);
    console.log(`║  POST  /api/v1/documents/upload              ║`);
    console.log(`║  POST  /api/v1/output/generate               ║`);
    console.log(`║  GET   /api/v1/health                        ║`);
    console.log('╚══════════════════════════════════════════════╝\n');
  });
}

// ── Start ──────────────────────────────────────────────────────────────────────
startServer().catch((err) => {
  console.error('❌ Server failed to start:', err.message);
  process.exit(1);
});
