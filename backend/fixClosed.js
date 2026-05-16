require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Observation = require('./models/Observation');
  const result = await Observation.updateMany(
    { status: 'Closed' },
    { $set: { mailingActive: false } }
  );
  console.log('Fixed:', result.modifiedCount, 'observations');
  process.exit();
}).catch(err => { console.error(err); process.exit(1); });