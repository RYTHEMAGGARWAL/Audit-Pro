const User = require('../models/User');
const { PASSWORD_REGEX } = require('../models/User');

exports.createUser = async (req, res) => {
  const { firstName, lastName, username, email, password, role, mustChangePassword } = req.body;
  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ message: 'Email or username already exists' });

    const user = await User.create({
      firstName, lastName, username, email, password,
      role: role || 'auditor',
      createdBy: req.user._id,
      mustChangePassword: mustChangePassword ?? true, // ✅ first login force
    });

    res.status(201).json({
      message: 'User created',
      user: { id: user._id, firstName: user.firstName, lastName: user.lastName, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('createdBy', 'firstName lastName');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'Password daalo!' });

    if (!PASSWORD_REGEX.test(newPassword))
      return res.status(400).json({ message: 'Password policy requirements poori nahi hui (8+ chars, upper, lower, number, special)' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    user.mustChangePassword = true; // ✅ next login pe force change
    await user.save();

    res.json({ message: 'Password reset!' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, username, email, role } = req.body;
    const existing = await User.findOne({
      $or: [{ email }, { username }],
      _id: { $ne: req.params.id }
    });
    if (existing) return res.status(400).json({ message: 'Email or username already taken' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, username, email, role },
      { new: true }
    ).select('-password');

    res.json({ message: 'User updated!', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getPendingApprovals = async (req, res) => {
  try {
    const obs = await require('../models/Observation').find({ approvalRequested: true })
      .populate('user', 'firstName lastName email')
      .sort('-approvalRequestedAt');
    res.json(obs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};