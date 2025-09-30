const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    required: true
  },
  response: {
    type: String
  },
  type: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  category: {
    type: String,
    enum: ['market', 'weather', 'soil', 'irrigation', 'pest', 'general']
  },
  confidence: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);