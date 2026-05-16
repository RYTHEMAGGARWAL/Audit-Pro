const express = require('express');
const router = express.Router();
const { createSession, getMySession } = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/select', createSession);
router.get('/my', getMySession);

module.exports = router;
