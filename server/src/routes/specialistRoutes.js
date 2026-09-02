const express = require('express');
const router = express.Router();
const specialistController = require('../controllers/specialistController');
const requireRole = require('../middlewares/roleMiddleware');
const uploadSpecialistDocs = require('../middlewares/uploadSpecialistDocs');

const handleUpload = (req, res, next) => {
  uploadSpecialistDocs.array('documents', 3)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Помилка завантаження файлу' });
    }
    next();
  });
};

router.get('/', specialistController.getApprovedSpecialists);
router.get('/pending', requireRole('ADMIN'), specialistController.getPendingSpecialists);
router.get('/me', requireRole('SPECIALIST'), specialistController.getMyProfile);
router.put('/me', requireRole('SPECIALIST'), specialistController.updateMyProfile);
router.post('/me/documents', requireRole('SPECIALIST'), handleUpload, specialistController.uploadDocuments);
router.put('/:id/verify', requireRole('ADMIN'), specialistController.verifySpecialist);
router.get('/:id', specialistController.getSpecialistById);

module.exports = router;
