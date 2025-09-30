const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/history', chatController.getChatHistory);
router.post('/message', chatController.saveMessage);
router.post('/analyze', chatController.analyzeQuery);

module.exports = router;