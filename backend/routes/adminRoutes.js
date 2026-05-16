const express = require('express');
const router = express.Router();
const { createUser, getAllUsers, deleteUser, resetUserPassword, updateUser } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect, adminOnly);

router.post('/create-user', createUser);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/reset-password', resetUserPassword);
router.put('/users/:id', updateUser);

module.exports = router;