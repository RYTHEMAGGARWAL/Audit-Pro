require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    const { runMailJob } = require('./utils/cronJob');
    await runMailJob();
    process.exit();
  })
  .catch(err => { console.error(err); process.exit(1); });