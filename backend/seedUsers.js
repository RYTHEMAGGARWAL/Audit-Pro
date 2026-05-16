require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('MongoDB Connected');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();

  for (const u of users) {
    const firstName = u.name?.split(' ')[0] || u.email?.split('@')[0] || 'User';
    const lastName = u.name?.split(' ')[1] || '';
    const username = u.email?.split('@')[0]?.toLowerCase() || 'user';

    await db.collection('users').updateOne(
      { _id: u._id },
      { $set: { firstName, lastName, username } }
    );
    console.log(`Updated: ${u.email} → username: ${username}, firstName: ${firstName}`);
  }

  console.log('Done!');
  process.exit();
}).catch(err => { console.error(err); process.exit(1); });