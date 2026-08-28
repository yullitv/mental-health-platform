const express = require('express');
const router = express.Router();
const specialistController = require('../controllers/specialistController');
const requireRole = require('../middlewares/roleMiddleware');

router.get('/', specialistController.getApprovedSpecialists);
router.get('/pending', requireRole('ADMIN'), specialistController.getPendingSpecialists);
router.put('/me', requireRole('SPECIALIST'), specialistController.updateMyProfile);
router.put('/:id/verify', requireRole('ADMIN'), specialistController.verifySpecialist);
router.get('/:id', specialistController.getSpecialistById);

module.exports = router;