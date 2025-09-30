const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');

router.get('/articles', knowledgeController.getArticles);
router.get('/categories', knowledgeController.getCategories);
router.get('/articles/:id', knowledgeController.getArticleById);
router.post('/articles', knowledgeController.createArticle);

module.exports = router;