const ChatMessage = require('../models/ChatMessage');

exports.getChatHistory = async (req, res) => {
  try {
    const { sessionId, limit = 50 } = req.query;
    
    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      data: messages,
      sessionId,
      count: messages.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching chat history',
      error: error.message
    });
  }
};

exports.saveMessage = async (req, res) => {
  try {
    const { sessionId, message, response, type, category } = req.body;
    
    const chatMessage = new ChatMessage({
      sessionId,
      message,
      response,
      type,
      category,
      userId: req.user?.id
    });
    
    await chatMessage.save();
    
    res.status(201).json({
      success: true,
      message: 'Chat message saved successfully',
      data: chatMessage
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error saving chat message',
      error: error.message
    });
  }
};

exports.analyzeQuery = async (req, res) => {
  try {
    const { message } = req.body;
    
    // Simple AI analysis (in production, integrate with actual AI service)
    const analysis = await analyzeUserQuery(message);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error analyzing query',
      error: error.message
    });
  }
};

// Simple query analysis (replace with actual AI integration)
async function analyzeUserQuery(message) {
  const lowerMessage = message.toLowerCase();
  
  const categories = {
    market: ['price', 'market', 'sell', 'buy', 'cost', 'mandi'],
    weather: ['weather', 'rain', 'temperature', 'humidity', 'climate'],
    soil: ['soil', 'ph', 'fertility', 'nutrient', 'compost'],
    irrigation: ['water', 'irrigation', 'drip', 'sprinkler'],
    pest: ['pest', 'insect', 'disease', 'fungus', 'weed']
  };
  
  let detectedCategory = 'general';
  let confidence = 0;
  
  for (const [category, keywords] of Object.entries(categories)) {
    const matches = keywords.filter(keyword => lowerMessage.includes(keyword));
    const matchConfidence = matches.length / keywords.length;
    
    if (matchConfidence > confidence) {
      confidence = matchConfidence;
      detectedCategory = category;
    }
  }
  
  return {
    category: detectedCategory,
    confidence: Math.round(confidence * 100),
    keywords: extractKeywords(message),
    intent: determineIntent(message)
  };
}

function extractKeywords(message) {
  // Simple keyword extraction
  const words = message.toLowerCase().split(/\s+/);
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'what', 'how', 'when', 'where', 'why'];
  return words.filter(word => word.length > 3 && !stopWords.includes(word));
}

function determineIntent(message) {
  if (message.includes('?') || message.includes('how') || message.includes('what')) {
    return 'question';
  }
  if (message.includes('help') || message.includes('problem')) {
    return 'help';
  }
  if (message.includes('price') || message.includes('market')) {
    return 'market_info';
  }
  return 'general';
}