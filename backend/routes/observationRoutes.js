const express = require('express');
const router = express.Router();
const { getObservations, createObservation, updateObservation, deleteObservation, startMailing, requestApproval, approveObservation } = require('../controllers/observationController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getObservations);
router.post('/', createObservation);
router.put('/:id', updateObservation);
router.delete('/:id', deleteObservation);
router.post('/:id/start-mailing', startMailing);
router.post('/:id/request-approval', requestApproval);
router.post('/:id/approve', adminOnly, approveObservation);
router.get('/pending-approvals', adminOnly, require('../controllers/observationController').getPendingApprovals);
router.get('/all', adminOnly, require('../controllers/observationController').getAllObservations);
module.exports = router;