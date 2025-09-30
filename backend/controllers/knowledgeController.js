const KnowledgeArticle = require('../models/KnowledgeArticle');

exports.getArticles = async (req, res) => {
  try {
    const { 
      category, 
      search, 
      page = 1, 
      limit = 10,
      featured 
    } = req.query;
    
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (featured === 'true') {
      query.isFeatured = true;
    }
    
    let searchQuery = KnowledgeArticle.find(query);
    
    // Text search if search parameter provided
    if (search) {
      searchQuery = KnowledgeArticle.find(
        { $text: { $search: search } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } });
    } else {
      searchQuery = searchQuery.sort({ views: -1, createdAt: -1 });
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    searchQuery = searchQuery.skip(skip).limit(parseInt(limit));
    
    const articles = await searchQuery.lean();
    const total = await KnowledgeArticle.countDocuments(query);
    
    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching articles',
      error: error.message
    });
  }
};

exports.getArticleById = async (req, res) => {
  try {
    const article = await KnowledgeArticle.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    // Increment view count
    article.views += 1;
    await article.save();
    
    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching article',
      error: error.message
    });
  }
};

exports.createArticle = async (req, res) => {
  try {
    const article = new KnowledgeArticle(req.body);
    await article.save();
    
    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: article
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating article',
      error: error.message
    });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await KnowledgeArticle.distinct('category');
    const counts = await Promise.all(
      categories.map(async (category) => {
        const count = await KnowledgeArticle.countDocuments({ category });
        return { category, count };
      })
    );
    
    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};