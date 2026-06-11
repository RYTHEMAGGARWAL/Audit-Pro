const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ✅ Password Policy
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  username:  { type: String, required: true, unique: true, trim: true, lowercase: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  {
    type: String,
    required: true,
    validate: {
      validator: function (val) {
        if (val.startsWith('$2')) return true;
        return PASSWORD_REGEX.test(val);
      },
      message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
    },
  },
  role:      { type: String, enum: ['admin', 'auditor'], default: 'auditor' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive:  { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  passwordChangedAt:  { type: Date, default: Date.now }, // ✅ NEW
  resetPasswordToken:  { type: String },
  resetPasswordExpire: { type: Date },
}, { timestamps: true });

userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!PASSWORD_REGEX.test(this.password)) {
    return next(new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character'));
  }
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now(); // ✅ har baar password change pe update
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ 30 din check method
userSchema.methods.isPasswordExpired = function () {
  if (!this.passwordChangedAt) return false;
  const daysSinceChange = (Date.now() - this.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24);
return daysSinceChange > 30;
};

module.exports = mongoose.model('User', userSchema);
module.exports.PASSWORD_REGEX = PASSWORD_REGEX;