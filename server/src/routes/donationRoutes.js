const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const requireRole = require('../middlewares/roleMiddleware');

router.post('/', requireRole('CLIENT'), donationController.createDonation);
router.get('/pending', requireRole('SPECIALIST', 'ADMIN'), donationController.getPendingDonations);
router.put('/:id/confirm', requireRole('SPECIALIST', 'ADMIN'), donationController.confirmDonation);
router.put('/:id/reject', requireRole('SPECIALIST', 'ADMIN'), donationController.rejectDonation);

module.exports = router;