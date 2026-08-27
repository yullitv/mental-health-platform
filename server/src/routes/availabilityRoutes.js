const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const requireRole = require('../middlewares/roleMiddleware');

// Лише для спеціаліста (керування власними слотами) — ці маршрути ПЕРШІ
router.get('/mine', requireRole('SPECIALIST'), availabilityController.getMySlots);
router.post('/', requireRole('SPECIALIST'), availabilityController.createSlot);
router.delete('/:id', requireRole('SPECIALIST'), availabilityController.deleteSlot);

// Публічний — вільні слоти конкретного спеціаліста (для сторінки бронювання)
router.get('/:specialistId', availabilityController.getAvailableSlots);

module.exports = router;