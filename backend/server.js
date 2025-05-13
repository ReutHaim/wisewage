const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');

const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const geminiRoutes = require('./routes/gemini');
const contracts = require('./routes/contracts');
const worker = require('./routes/worker');
const payslip = require('./routes/payslip');

const app = express();


app.use(express.json());
app.use(cors());
app.use(logger);

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

    app.use(errorHandler);

    app.listen(3000, '127.0.0.1', () => {
      console.log('Server running at http://lcoalhost:3000');
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}

startServer();