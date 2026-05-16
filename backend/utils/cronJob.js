const cron = require('node-cron');
const Observation = require('../models/Observation');
const { sendReminderMail } = require('./mailer');

const shouldSendAC = (daysLeft) => {
  if (daysLeft < 0) return false;
  if (daysLeft <= 7) return true;
  if (daysLeft <= 15) return daysLeft % 7 === 0;
  return daysLeft % 15 === 0;
};

const shouldSendPR = (daysLeft) => {
  return daysLeft === 7 || daysLeft === 2 || daysLeft === 0;
};

const runMailJob = async () => {
  console.log('📧 Running mail job...', new Date().toLocaleString('en-IN'));
  try {
    const observations = await Observation.find({
      status: 'Open',
      mailingActive: true,
      closingPeriod: { $exists: true, $ne: '' },
    });

    console.log(`Found ${observations.length} active mailing observations`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let mailsSent = 0;

    for (const obs of observations) {
      const closing = new Date(obs.closingPeriod);
      closing.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((closing - today) / (1000 * 60 * 60 * 24));

      console.log(`${obs.uniqueKey} — ${daysLeft} days left`);

      const baseData = {
        uniqueKey: obs.uniqueKey,
        area: obs.area,
        observation: obs.observation,
        closingPeriod: obs.closingPeriod,
        personResponsible: obs.personResponsible,
        personResponsibilityAsPerAC: obs.personResponsibilityAsPerAC,
        daysLeft,
        isInitial: false,
        mailThreadId: obs.mailThreadId,
      };

      // AC emails
      if (shouldSendAC(daysLeft)) {
        const acEmails = (obs.personResponsibilityEmails || '').split(',').map(s => s.trim()).filter(Boolean);
        for (const email of acEmails) {
          try {
            await sendReminderMail(email, { ...baseData, recipientType: 'ac' });
            console.log(`✅ AC mail → ${email} (${daysLeft}d left)`);
            mailsSent++;
          } catch (err) { console.error(`❌ AC mail failed ${email}:`, err.message); }
        }
      }

      // PR emails
      if (shouldSendPR(daysLeft)) {
        const prEmails = (obs.personResponsibleEmails || '').split(',').map(s => s.trim()).filter(Boolean);
        for (const email of prEmails) {
          try {
            await sendReminderMail(email, { ...baseData, recipientType: 'pr' });
            console.log(`✅ PR mail → ${email} (${daysLeft}d left)`);
            mailsSent++;
          } catch (err) { console.error(`❌ PR mail failed ${email}:`, err.message); }
        }
      }
    }

    console.log(`📧 Done. ${mailsSent} mails sent.`);
  } catch (err) {
    console.error('Cron error:', err);
  }
};

const startCronJob = () => {
  cron.schedule('0 9 * * *', runMailJob, { timezone: 'Asia/Kolkata' });
  console.log('⏰ Cron scheduled — 9 AM IST daily');
};

module.exports = { startCronJob, runMailJob };