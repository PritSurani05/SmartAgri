const mongoose = require('mongoose');

const knowledgeArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['soil', 'irrigation', 'pest', 'harvest', 'crop', 'market', 'technology']
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  author: {
    type: String,
    default: 'Agricultural Expert'
  },
  views: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    default: 'english'
  }
}, {
  timestamps: true
});

// Text search index
knowledgeArticleSchema.index({ 
  title: 'text', 
  content: 'text', 
  tags: 'text', 
  summary: 'text' 
});

module.exports = mongoose.model('KnowledgeArticle', knowledgeArticleSchema);