const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, enum: ['NIIT', 'NLSL'], required: true },
  financialYear: { type: String, required: true }, // e.g. "2024-25"
  business: { type: String, enum: ['Financial', 'Privacy'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);
