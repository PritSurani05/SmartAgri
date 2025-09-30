const mongoose = require('mongoose');

const marketDataSchema = new mongoose.Schema({
  crop: {
    type: String,
    required: true,
    enum: ['wheat', 'rice', 'cotton', 'sugarcane', 'maize', 'tomato', 'potato', 'onion']
  },
  market: {
    type: String,
    required: true,
    enum: ['delhi', 'mumbai', 'pune', 'bangalore', 'hyderabad', 'chennai', 'kolkata']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  trend: {
    type: String,
    enum: ['up', 'down', 'stable'],
    default: 'stable'
  },
  change: {
    type: Number,
    default: 0
  },
  volume: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    default: 'quintal'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    default: 'government'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
marketDataSchema.index({ crop: 1, market: 1, lastUpdated: -1 });

module.exports = mongoose.model('MarketData', marketDataSchema);