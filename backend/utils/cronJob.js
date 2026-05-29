const cron = require('node-cron');
const Observation = require('../models/Observation');
const { sendReminderMail } = require('./mailer');

// ─────────────────────────────────────────────
// HELPER: days since reopen
// ─────────────────────────────────────────────
const daysSince = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.floor((today - d) / (1000 * 60 * 60 * 24));
};

// ─────────────────────────────────────────────
// PR LOGIC
// ─────────────────────────────────────────────
//
// Normal (not reopened):
//   - Initial mail → handled at mailing start (not cron)
//   - daysLeft > 7  → every 15 days (based on mailingStartedAt)
//   - daysLeft === 7 → once (day 7)
//   - daysLeft <= 3  → daily (day 3, 2, 1, 0)
//
// Reopened:
//   - daysLeft > 7  → every 7 days (based on reopenedAt)
//   - daysLeft <= 7 → daily
//
const shouldSendPR = (daysLeft, obs) => {
  const isReopened = obs.reopened && obs.reopenedAt;

  if (isReopened) {
    if (daysLeft < 0) return false;
    if (daysLeft <= 7) return true;                        // daily last 7 days
    const daysSinceReopen = daysSince(obs.reopenedAt);
    return daysSinceReopen > 0 && daysSinceReopen % 7 === 0; // every 7 days after reopen
  }

  // Normal flow
  if (daysLeft < 0) return false;
  if (daysLeft <= 3) return true;                          // daily: day 3, 2, 1, 0
  if (daysLeft === 7) return true;                         // once on day 7
  if (daysLeft > 7) {
    // every 15 days based on mailingStartedAt
    if (!obs.mailingStartedAt) return false;
    const daysSinceStart = daysSince(obs.mailingStartedAt);
    return daysSinceStart > 0 && daysSinceStart % 15 === 0;
  }
  return false;
};

// ─────────────────────────────────────────────
// AC LOGIC
// ─────────────────────────────────────────────
//
// Normal (not reopened):
//   - NO mail during normal open phase
//   - daysLeft < 0 (expired) → once (handled via acExpiredMailSent flag ideally,
//     but we send on day daysLeft === -1 to approximate "just expired")
//
// Reopened:
//   - daysLeft > 7  → every 7 days (based on reopenedAt)
//   - daysLeft <= 7 → daily
//
const shouldSendAC = (daysLeft, obs) => {
  const isReopened = obs.reopened && obs.reopenedAt;

  if (isReopened) {
    if (daysLeft < 0) return false;
    if (daysLeft <= 7) return true;                        // daily last 7 days
    const daysSinceReopen = daysSince(obs.reopenedAt);
    return daysSinceReopen > 0 && daysSinceReopen % 7 === 0; // every 7 days after reopen
  }

  // Normal flow — AC only gets mail when expired (daysLeft === -1 = just crossed deadline)
  if (daysLeft === -1) return true;

  return false;
};

// ─────────────────────────────────────────────
// MAIN JOB
// ─────────────────────────────────────────────
const runMailJob = async () => {
  console.log('📧 Running mail job...', new Date().toLocaleString('en-IN'));
  try {
    const observations = await Observation.find({
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

      console.log(`${obs.uniqueKey} — ${daysLeft} days left | reopened: ${obs.reopened}`);

      const baseData = {
        uniqueKey: obs.uniqueKey,
        area: obs.area,
        observation: obs.observation,
        managerComment: obs.managerComment,
        closingPeriod: obs.closingPeriod,
        personResponsible: obs.personResponsible,
        personResponsibilityAsPerAC: obs.personResponsibilityAsPerAC,
        daysLeft,
        isInitial: false,
        mailThreadId: obs.mailThreadId,
      };

      // ── PR emails ──
      if (shouldSendPR(daysLeft, obs)) {
        const prEmails = (obs.personResponsibleEmails || '').split(',').map(s => s.trim()).filter(Boolean);
        for (const email of prEmails) {
          try {
            await sendReminderMail(email, { ...baseData, recipientType: 'pr' });
            console.log(`✅ PR mail → ${email} (${daysLeft}d left)`);
            mailsSent++;
          } catch (err) {
            console.error(`❌ PR mail failed ${email}:`, err.message);
          }
        }
      }

      // ── AC emails ──
      if (shouldSendAC(daysLeft, obs)) {
        const acEmails = (obs.personResponsibilityEmails || '').split(',').map(s => s.trim()).filter(Boolean);
        for (const email of acEmails) {
          try {
            await sendReminderMail(email, {
              ...baseData,
              recipientType: 'ac',
              isExpired: daysLeft < 0,
            });
            console.log(`✅ AC mail → ${email} (${daysLeft}d left)`);
            mailsSent++;
          } catch (err) {
            console.error(`❌ AC mail failed ${email}:`, err.message);
          }
        }
      }
    }

    console.log(`📧 Done. ${mailsSent} mails sent.`);
  } catch (err) {
    console.error('Cron error:', err);
  }
};

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
const startCronJob = () => {
  cron.schedule('0 9 * * *', runMailJob, { timezone: 'Asia/Kolkata' });
  console.log('⏰ Cron scheduled — 9 AM IST daily');
};

module.exports = { startCronJob, runMailJob };