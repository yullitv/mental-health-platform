const express = require('express');
const router = express.Router();
const screeningController = require('../controllers/screeningController');
const requireRole = require('../middlewares/roleMiddleware');

router.post('/', requireRole('CLIENT'), screeningController.createResult);
router.get('/mine', requireRole('CLIENT'), screeningController.getMyResults);

module.exports = router;
