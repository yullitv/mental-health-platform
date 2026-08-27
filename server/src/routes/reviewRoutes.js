const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const requireRole = require('../middlewares/roleMiddleware');

router.post('/', requireRole('CLIENT'), reviewController.createReview);
router.get('/mine', requireRole('CLIENT'), reviewController.getMyReviews);
router.get('/specialist/:specialistId', reviewController.getSpecialistReviews);

module.exports = router;
