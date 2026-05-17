require('dotenv').config(); // ← SABSE PEHLE

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startCronJob } = require('./utils/cronJob');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://audit-pro-drab.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/session', require('./routes/sessionRoutes'));
app.use('/api/observations', require('./routes/observationRoutes'));

app.get('/', (req, res) => res.json({ message: 'Audit App API Running' }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    startCronJob();
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => console.error('MongoDB Error:', err));