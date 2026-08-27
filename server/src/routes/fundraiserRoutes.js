const express = require('express');
const router = express.Router();
const fundraiserController = require('../controllers/fundraiserController');
const requireRole = require('../middlewares/roleMiddleware');

// Публічний маршрут — список активних фондів
router.get('/', fundraiserController.getActiveFundraisers);

// Нижче — лише для адміна
router.get('/admin', requireRole('ADMIN'), fundraiserController.getAllFundraisers);
router.post('/', requireRole('ADMIN'), fundraiserController.createFundraiser);
router.put('/:id', requireRole('ADMIN'), fundraiserController.updateFundraiser);

module.exports = router;