const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendReminderMail = async (toEmail, data) => {
  const { uniqueKey, area, observation, closingPeriod, personResponsible,
    personResponsibilityAsPerAC, daysLeft, isInitial, recipientType, mailThreadId } = data;

  let urgencyColor = '#3b82f6';
  let urgencyText = 'Reminder';
  let headerMsg = 'This is a reminder for your pending audit observation.';


  if (data.isPasswordReset) {
  await transporter.sendMail({
    from: `"AuditPro" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: '[AuditPro] Password Reset Request',
    html: `
    <div style="max-width:520px;margin:32px auto;font-family:'Segoe UI',Arial,sans-serif;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#1e3a5f,#1e1b4b);padding:24px 32px;">
        <div style="font-size:20px;font-weight:700;color:#fff;">AuditPro</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Internal Audit Management System</div>
      </div>
      <div style="background:#3b82f6;padding:11px 32px;">
        <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">🔐 PASSWORD RESET REQUEST</span>
      </div>
      <div style="padding:28px 32px;">
        <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0 0 16px;">Hello ${data.userName},</p>
        <p style="font-size:14px;color:#475569;margin:0 0 24px;">We received a request to reset your AuditPro password. Click the button below to set a new password. This link expires in 30 minutes.</p>
        <a href="${data.resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Reset Password</a>
        <p style="margin-top:20px;font-size:12px;color:#94a3b8;">If you did not request this, please ignore this email.</p>
      </div>
    </div>`,
  });
  return;
}

  const isReopened = data.isReopened || false;
  const isExpired  = data.isExpired  || false;
  const isClosed   = data.isClosed   || false;

  // ── CLOSED notification ──
  if (isClosed) {
    urgencyColor = '#64748b';
    urgencyText  = 'OBSERVATION CLOSED';
    headerMsg    = 'This audit observation has been closed.';

  // ── INITIAL mail (mailing start pe) ──
  } else if (isInitial) {
    urgencyColor = '#3b82f6';
    urgencyText  = 'New Observation Assigned';
    headerMsg    = 'A new audit observation has been assigned. Please review and take necessary action.';

  // ── AC — Expired (overdue, normal flow) ──
  } else if (recipientType === 'ac' && isExpired) {
    urgencyColor = '#7c3aed';
    urgencyText  = 'OBSERVATION EXPIRED';
    headerMsg    = 'The audit observation deadline has passed without closure.';

  // ── AC — Reopened phase ──
  } else if (recipientType === 'ac' && isReopened) {
    if (daysLeft <= 7) {
      urgencyColor = '#dc2626'; urgencyText = 'URGENT — CLOSING SOON';
      headerMsg    = 'The reopened observation is closing very soon. Immediate attention needed.';
    } else {
      urgencyColor = '#f59e0b'; urgencyText = 'REOPENED — ACTION REQUIRED';
      headerMsg    = 'The audit observation has been reopened. Please monitor progress.';
    }

  // ── PR — Reopened phase ──
  } else if (recipientType === 'pr' && isReopened) {
    if (daysLeft <= 7) {
      urgencyColor = '#dc2626'; urgencyText = 'URGENT — CLOSING SOON';
      headerMsg    = 'The reopened observation is closing very soon. Immediate action required.';
    } else {
      urgencyColor = '#f59e0b'; urgencyText = 'REOPENED — ACTION REQUIRED';
      headerMsg    = 'The audit observation assigned to you has been reopened.';
    }

  // ── PR — Normal phase ──
  } else if (recipientType === 'pr') {
    if (daysLeft === 0) {
      urgencyColor = '#dc2626'; urgencyText = 'CLOSING TODAY';
      headerMsg    = 'The audit observation assigned to you is closing TODAY.';
    } else if (daysLeft <= 3) {
      urgencyColor = '#ea580c'; urgencyText = `CLOSING IN ${daysLeft} DAY${daysLeft === 1 ? '' : 'S'}`;
      headerMsg    = `The audit observation is closing in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`;
    } else if (daysLeft === 7) {
      urgencyColor = '#f59e0b'; urgencyText = 'ACTION REQUIRED';
      headerMsg    = 'The audit observation assigned to you is closing in 7 days.';
    } else {
      urgencyColor = '#3b82f6'; urgencyText = 'REMINDER';
      headerMsg    = 'This is a periodic reminder for your pending audit observation.';
    }
  }

  // ── Subject line ──
  const subject = isClosed
    ? `[AuditPro] [Closed] ${uniqueKey}`
    : isInitial
      ? `[AuditPro] New Assignment — ${uniqueKey}`
      : isExpired
        ? `[AuditPro] [EXPIRED] ${uniqueKey} — Deadline Passed`
        : `[AuditPro] [${urgencyText}] ${uniqueKey} — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e3a5f,#1e1b4b);padding:24px 32px;">
      <div style="font-size:20px;font-weight:700;color:#fff;">AuditPro</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Internal Audit Management System</div>
    </div>
    <div style="background:${urgencyColor};padding:11px 32px;">
      <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
        ${isClosed
          ? '✅ OBSERVATION CLOSED'
          : isInitial
            ? '📋 NEW OBSERVATION ASSIGNED'
            : isExpired
              ? `⛔ ${urgencyText}`
              : isReopened
                ? `🔄 ${urgencyText} — ${daysLeft} Day${daysLeft === 1 ? '' : 's'} Remaining`
                : `⚠ ${urgencyText} — ${daysLeft} Day${daysLeft === 1 ? '' : 's'} Remaining`}
      </span>
    </div>
    <div style="padding:24px 32px;">
      <p style="font-size:14px;color:#1e293b;font-weight:600;margin:0 0 18px;">${headerMsg}</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <tr style="background:#f8fafc;">
          <td style="padding:9px 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;width:38%;border-bottom:1px solid #e2e8f0;">Unique Key</td>
          <td style="padding:9px 14px;font-size:13px;color:#1e293b;font-weight:700;border-bottom:1px solid #e2e8f0;font-family:monospace;">${uniqueKey}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Area</td>
          <td style="padding:9px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${area}</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:9px 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Observation</td>
          <td style="padding:9px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${observation || '—'}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Management Comment</td>
          <td style="padding:9px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${data.managerComment || '—'}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Person (AC)</td>
          <td style="padding:9px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${personResponsibilityAsPerAC || '—'}</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:9px 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">Person Responsible</td>
          <td style="padding:9px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${personResponsible || '—'}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;">Closing Date</td>
          <td style="padding:9px 14px;font-size:13px;color:${urgencyColor};font-weight:700;">
            ${closingPeriod ? new Date(closingPeriod).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' }) : '—'}
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;

  const mailOptions = {
    from: `"AuditPro" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject,
    html,
  };

  // Thread support — add References header for same thread
  if (mailThreadId && !isInitial) {
    mailOptions.inReplyTo = mailThreadId;
    mailOptions.references = mailThreadId;
  } else if (mailThreadId && isInitial) {
    mailOptions.messageId = mailThreadId;
  }

  await transporter.sendMail(mailOptions);
};

module.exports = { sendReminderMail };