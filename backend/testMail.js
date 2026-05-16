require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    console.log('MAIL_USER:', process.env.MAIL_USER); // check karo
    
    const { sendReminderMail } = require('./utils/mailer');
    await sendReminderMail('rythemaggarwal7840@gmail.com', {
      uniqueKey: 'TEST-001',
      area: 'P2P Review',
      observation: 'Test observation',
      closingPeriod: '2026-06-25',
      personResponsible: 'Rythem',
      personResponsibilityAsPerAC: 'Test AC',
      daysLeft: 5,
      isInitial: false,
      recipientType: 'ac',
      mailThreadId: null,
    });
    console.log('Mail sent!');
    process.exit();
  })
  .catch(err => { console.error(err); process.exit(1); });