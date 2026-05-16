const Observation = require('../models/Observation');
const { sendReminderMail } = require('../utils/mailer');
const crypto = require('crypto');

const generateUniqueKey = async (financialYear, business, area) => {
  const fy = financialYear.replace('-', '');
  const biz = business === 'Financial' ? 'FIN' : 'PRV';
  const areaCode = area.substring(0, 3).toUpperCase().replace(/ /g, '');
  const prefix = `${fy}-${biz}-${areaCode}`;
  const count = await Observation.countDocuments({ uniqueKey: { $regex: `^${prefix}` } });
  const serial = String(count + 1).padStart(3, '0');
  return `${prefix}-${serial}`;
};

exports.getObservations = async (req, res) => {
  try {
    const { company, financialYear, business } = req.query;
    const filter = { user: req.user._id };
    if (company) filter.company = company;
    if (financialYear) filter.financialYear = financialYear;
    if (business) filter.business = business;
    const obs = await Observation.find(filter).sort('createdAt');
    res.json(obs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
exports.getAllObservations = async (req, res) => {
  try {
    const obs = await Observation.find()
      .populate('user', 'firstName lastName username email')
      .sort('-createdAt');
    res.json(obs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
exports.getPendingApprovals = async (req, res) => {
  try {
    const obs = await Observation.find({ approvalRequested: true })
      .populate('user', 'name email')
      .sort('-approvalRequestedAt');
    res.json(obs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.createObservation = async (req, res) => {
  try {
    const { financialYear, business, area } = req.body;
    const uniqueKey = area ? await generateUniqueKey(financialYear, business, area) : '';
    const obs = await Observation.create({ user: req.user._id, uniqueKey, ...req.body });
    res.status(201).json(obs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateObservation = async (req, res) => {
  try {
    const existing = await Observation.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    
    // Locked row pe sirf remarks, attachment, status allow karo
    if (existing.locked) {
      const allowedFields = ['remarks', 'attachment', 'attachmentName', 'status', 'mailingActive'];
      const hasOtherFields = Object.keys(req.body).some(k => !allowedFields.includes(k));
      if (hasOtherFields) {
        const filtered = {};
        allowedFields.forEach(f => { if (req.body[f] !== undefined) filtered[f] = req.body[f]; });
        req.body = filtered;
      }
    }

    if (!existing.locked && req.body.area && req.body.area !== existing.area) {
      req.body.uniqueKey = await generateUniqueKey(existing.financialYear, existing.business, req.body.area);
    }

    // Status Closed → mailing band
    if (req.body.status === 'Closed' && existing.status !== 'Closed') {
  req.body.mailingActive = false;
  const acEmails = (existing.personResponsibilityEmails || '').split(',').map(s => s.trim()).filter(Boolean);
  const prEmails = (existing.personResponsibleEmails || '').split(',').map(s => s.trim()).filter(Boolean);
  const allEmails = [...new Set([...acEmails, ...prEmails])];
  const mailData = {
    uniqueKey: existing.uniqueKey, area: existing.area,
    observation: existing.observation, closingPeriod: existing.closingPeriod,
    personResponsible: existing.personResponsible,
    personResponsibilityAsPerAC: existing.personResponsibilityAsPerAC,
    isClosed: true, mailThreadId: existing.mailThreadId,
  };
  for (const email of allEmails) {
    try { await sendReminderMail(email, mailData); } catch (e) { console.error(e.message); }
  }
}

// Extra line — har baar Closed ho toh mailingActive false
if (req.body.status === 'Closed') {
  req.body.mailingActive = false;
}

    const obs = await Observation.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    res.json(obs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteObservation = async (req, res) => {
  try {
    await Observation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Start mailing — lock the row and send initial mail
exports.startMailing = async (req, res) => {
  try {
    const obs = await Observation.findOne({ _id: req.params.id, user: req.user._id });
    if (!obs) return res.status(404).json({ message: 'Not found' });
    if (obs.mailingActive) return res.status(400).json({ message: 'Mailing already active' });
    if (!obs.closingPeriod) return res.status(400).json({ message: 'Closing period set karo pehle' });

    const acEmails = (obs.personResponsibilityEmails || '').split(',').map(s => s.trim()).filter(Boolean);
    const prEmails = (obs.personResponsibleEmails || '').split(',').map(s => s.trim()).filter(Boolean);
    if (acEmails.length === 0 && prEmails.length === 0) {
      return res.status(400).json({ message: 'Koi email add nahi hai' });
    }

    // Generate unique thread ID for this observation
    const mailThreadId = `<obs-${obs._id}-${Date.now()}@auditpro>`;

    const today = new Date();
    const closing = new Date(obs.closingPeriod);
    const daysLeft = Math.ceil((closing - today) / (1000 * 60 * 60 * 24));

    const mailData = {
      uniqueKey: obs.uniqueKey,
      area: obs.area,
      observation: obs.observation,
      closingPeriod: obs.closingPeriod,
      personResponsible: obs.personResponsible,
      personResponsibilityAsPerAC: obs.personResponsibilityAsPerAC,
      daysLeft,
      isInitial: true,
      mailThreadId,
    };

    // Send initial mail to AC
    for (const email of acEmails) {
      try {
        await sendReminderMail(email, { ...mailData, recipientType: 'ac' });
        console.log(`📧 Initial AC mail sent to ${email}`);
      } catch (e) { console.error('AC mail error:', e.message); }
    }

    // Send initial mail to PR
    for (const email of prEmails) {
      try {
        await sendReminderMail(email, { ...mailData, recipientType: 'pr' });
        console.log(`📧 Initial PR mail sent to ${email}`);
      } catch (e) { console.error('PR mail error:', e.message); }
    }

    // Lock and activate mailing
    const updated = await Observation.findByIdAndUpdate(obs._id, {
      mailingActive: true,
      mailingStartedAt: new Date(),
      mailThreadId,
      locked: true,
    }, { new: true });

    res.json({ message: 'Mailing started! Row is now locked.', obs: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Auditor requests admin to reopen
exports.requestApproval = async (req, res) => {
  try {
    const obs = await Observation.findOne({ _id: req.params.id, user: req.user._id });
    if (!obs) return res.status(404).json({ message: 'Not found' });

    const updated = await Observation.findByIdAndUpdate(obs._id, {
      approvalRequested: true,
      approvalRequestedAt: new Date(),
      status: 'Pending Approval',
    }, { new: true });

    res.json({ message: 'Approval request sent to admin', obs: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Admin approves — unlock and extend date
exports.approveObservation = async (req, res) => {
  try {
    const { newClosingPeriod } = req.body;
    const obs = await Observation.findById(req.params.id);
    if (!obs) return res.status(404).json({ message: 'Not found' });

    const updated = await Observation.findByIdAndUpdate(obs._id, {
      locked: false,
      approvalRequested: false,
      status: 'Open',
      closingPeriod: newClosingPeriod || obs.closingPeriod,
    }, { new: true });

    res.json({ message: 'Approved! Row unlocked.', obs: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};