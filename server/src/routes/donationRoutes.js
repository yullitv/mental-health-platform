const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const requireRole = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/upload');

const handleUpload = (req, res, next) => {
  upload.single('proof')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Помилка завантаження файлу' });
    }
    next();
  });
};

router.post('/', requireRole('CLIENT'), handleUpload, donationController.createDonation);
router.get('/pending', requireRole('SPECIALIST', 'ADMIN'), donationController.getPendingDonations);
router.put('/:id/confirm', requireRole('SPECIALIST', 'ADMIN'), donationController.confirmDonation);
router.put('/:id/reject', requireRole('SPECIALIST', 'ADMIN'), donationController.rejectDonation);

module.exports = router;