const express = require('express');
const { MongoClient } = require('mongodb');
const authRoutes = require('./routes/auth');
const geminiRoutes = require(`./routes/gemini.js`);

const app = express();
app.use(express.json());

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
    app.use("/api/gemini", geminiRoutes);

    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000');
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}

startServer();
