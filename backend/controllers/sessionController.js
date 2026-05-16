const Session = require('../models/Session');

// @POST /api/session/select
exports.createSession = async (req, res) => {
  const { company, financialYear, business } = req.body;
  try {
    if (!company || !financialYear || !business)
      return res.status(400).json({ message: 'All fields are required' });

    const session = await Session.create({
      user: req.user._id,
      company, financialYear, business
    });

    res.status(201).json({ message: 'Session created', session });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @GET /api/session/my
exports.getMySession = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id }).sort('-createdAt');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
