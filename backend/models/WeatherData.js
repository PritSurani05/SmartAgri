const mongoose = require('mongoose');

const weatherDataSchema = new mongoose.Schema({
  city: {
    type: String,
    required: true,
    enum: ['delhi', 'mumbai', 'pune', 'bangalore', 'hyderabad', 'chennai', 'kolkata']
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  rainfall: {
    type: Number,
    default: 0
  },
  condition: {
    type: String,
    required: true
  },
  windSpeed: {
    type: Number,
    default: 0
  },
  pressure: {
    type: Number,
    default: 1013
  },
  forecast: [{
    date: Date,
    temperature: Number,
    condition: String,
    rainfall: Number
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WeatherData', weatherDataSchema);