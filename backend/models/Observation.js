const mongoose = require('mongoose');

const observationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, enum: ['NIIT', 'NLSL'], required: true },
  financialYear: { type: String, required: true },
  business: { type: String, enum: ['Financial', 'Privacy'], required: true },
  uniqueKey: { type: String, default: '' },
  area: { type: String, default: '' },
  observation: { type: String, default: '' },
  managerComment: { type: String, default: '' },
  personResponsibilityAsPerAC: { type: String, default: '' },
  personResponsibilityEmails: { type: String, default: '' },
  personResponsible: { type: String, default: '' },
  personResponsibleEmails: { type: String, default: '' },
  remarks: { type: String, default: '' },
  attachment: { type: String, default: '' },
  attachmentName: { type: String, default: '' },
  status: { type: String, enum: ['Open', 'Closed', 'Pending Approval'], default: 'Open' },
  closingPeriod: { type: String, default: '' },
  mailingActive: { type: Boolean, default: false },
  mailingStartedAt: { type: Date },
  mailThreadId: { type: String, default: '' },
  locked: { type: Boolean, default: false },
  approvalRequested: { type: Boolean, default: false },
  approvalRequestedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Observation', observationSchema);