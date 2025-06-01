require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');

// Set Docker container environment variable
process.env.DOCKER_CONTAINER = true;

const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const geminiRoutes = require('./routes/gemini');
const contracts = require('./routes/contracts');
const worker = require('./routes/worker');
const payslip = require('./routes/payslip');

const app = express();

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    const allowedOrigins = [
      'http://vmedu421.mtacloud.co.il',
      'https://vmedu421.mtacloud.co.il',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'null'  // Allow file:// protocol during development
    ];
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 3600
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(logger);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Allow requests from any origin in development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  next();
});

app.use(express.static(path.join(__dirname, '../frontend')));

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);
let db;

async function startServer() {
  try {
    await client.connect();
    db = client.db('wisewage');
    console.log('Connected to MongoDB');

    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/gemini', geminiRoutes);
    app.use('/api/contracts', contracts);    
    app.use('/api/workers', worker);
    app.use('/api/payslips', payslip);

    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/login.html'));
    });

    // Handle 404 errors
    app.use((req, res) => {
      res.status(404).sendFile(path.join(__dirname, '../frontend/login.html'));
    });

    app.use(errorHandler);

    const port = process.env.PORT || 3000;
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

    app.listen(port, host, () => {
      console.log(`Server running on ${host}:${port}`);
    });

  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing HTTP server and MongoDB connection');
  await client.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing HTTP server and MongoDB connection');
  await client.close();
  process.exit(0);
});

startServer();