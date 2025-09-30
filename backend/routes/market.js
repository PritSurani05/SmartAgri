const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

// Public routes
router.get('/prices', marketController.getMarketPrices);
router.get('/history', marketController.getPriceHistory);
router.get('/stats', marketController.getMarketStats);
router.get('/analysis', marketController.getMarketAnalysis);
router.get('/deals', marketController.getBestDeals);

// Protected routes (add auth middleware in production)
router.post('/add', marketController.addMarketData);

module.exports = router;