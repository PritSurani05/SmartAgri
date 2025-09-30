const axios = require('axios');
const MarketData = require('../models/MarketData');

class MarketService {
  constructor() {
    this.basePrices = {
      'wheat': { base: 2100, volatility: 100 },
      'rice': { base: 3200, volatility: 150 },
      'cotton': { base: 5800, volatility: 300 },
      'sugarcane': { base: 320, volatility: 20 },
      'maize': { base: 1800, volatility: 80 },
      'tomato': { base: 1200, volatility: 400 },
      'potato': { base: 800, volatility: 200 },
      'onion': { base: 1500, volatility: 500 }
    };
  }

  // Simulate realistic market data updates
  generateMarketData(crop, market) {
    const base = this.basePrices[crop];
    if (!base) return null;

    // Market-specific adjustments
    const marketMultipliers = {
      'delhi': 1.0,
      'mumbai': 1.05,
      'pune': 0.98,
      'bangalore': 1.08,
      'hyderabad': 1.02,
      'chennai': 1.03,
      'kolkata': 0.95
    };

    const multiplier = marketMultipliers[market] || 1.0;
    
    // Generate realistic price with trend
    const basePrice = base.base * multiplier;
    const change = (Math.random() - 0.5) * 2 * base.volatility;
    const newPrice = Math.max(basePrice * 0.5, Math.round(basePrice + change));
    
    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
    const changePercent = ((change / basePrice) * 100).toFixed(2);

    return {
      crop,
      market,
      price: newPrice,
      trend,
      change: parseFloat(changePercent),
      volume: Math.round(Math.random() * 2000 + 500),
      lastUpdated: new Date()
    };
  }

  // Fetch real market data from government APIs (example)
  async fetchRealMarketData(crop, market) {
    try {
      // Example integration with government API
      const response = await axios.get('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070', {
        params: {
          'api-key': process.env.MARKET_API_KEY,
          'filters[crop]': crop,
          'filters[market]': market,
          'limit': 1
        }
      });

      if (response.data.records && response.data.records.length > 0) {
        const record = response.data.records[0];
        return {
          crop,
          market,
          price: parseFloat(record.modal_price),
          trend: 'stable', // You'd calculate this from historical data
          change: 0,
          volume: parseInt(record.arrival_weight) || 0,
          lastUpdated: new Date(),
          source: 'government_api'
        };
      }
    } catch (error) {
      console.log('Government API failed, using simulated data');
    }

    // Fallback to simulated data
    return this.generateMarketData(crop, market);
  }

  // Price trend analysis
  async analyzePriceTrends(crop, market, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const historicalData = await MarketData.find({
      crop,
      market,
      lastUpdated: { $gte: startDate }
    }).sort({ lastUpdated: 1 });

    if (historicalData.length === 0) {
      return {
        trend: 'unknown',
        confidence: 0,
        recommendation: 'Insufficient data for analysis'
      };
    }

    const prices = historicalData.map(data => data.price);
    const currentPrice = prices[prices.length - 1];
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Simple trend calculation
    const firstHalfAvg = prices.slice(0, Math.floor(prices.length / 2))
      .reduce((a, b) => a + b, 0) / Math.floor(prices.length / 2);
    const secondHalfAvg = prices.slice(Math.floor(prices.length / 2))
      .reduce((a, b) => a + b, 0) / Math.ceil(prices.length / 2);

    const trend = secondHalfAvg > firstHalfAvg ? 'up' : 
                 secondHalfAvg < firstHalfAvg ? 'down' : 'stable';

    const confidence = Math.min(100, Math.max(0, 
      Math.abs((secondHalfAvg - firstHalfAvg) / averagePrice) * 1000
    ));

    return {
      trend,
      confidence: Math.round(confidence),
      currentPrice,
      averagePrice: Math.round(averagePrice),
      priceChange: Math.round(currentPrice - averagePrice),
      priceChangePercent: ((currentPrice - averagePrice) / averagePrice * 100).toFixed(2),
      recommendation: this.getTradingRecommendation(trend, confidence, currentPrice, averagePrice)
    };
  }

  getTradingRecommendation(trend, confidence, currentPrice, averagePrice) {
    if (confidence < 30) {
      return 'Market is stable. Consider holding current positions.';
    }

    if (trend === 'up' && confidence > 60) {
      return 'Strong upward trend. Good time to sell if you have inventory.';
    }

    if (trend === 'down' && confidence > 60) {
      return 'Prices declining. Consider waiting for better prices or buy if needed.';
    }

    if (currentPrice > averagePrice * 1.1) {
      return 'Prices are above average. Consider selling if you have surplus.';
    }

    if (currentPrice < averagePrice * 0.9) {
      return 'Prices are below average. Good time to buy if you need stock.';
    }

    return 'Market conditions are neutral. Monitor for better opportunities.';
  }

  // Market comparison across different markets
  async compareMarkets(crop) {
    const markets = ['delhi', 'mumbai', 'pune', 'bangalore', 'hyderabad'];
    const comparisons = [];

    for (const market of markets) {
      const data = await MarketData.findOne({ crop, market })
        .sort({ lastUpdated: -1 });
      
      if (data) {
        comparisons.push({
          market,
          price: data.price,
          trend: data.trend,
          change: data.change,
          lastUpdated: data.lastUpdated
        });
      }
    }

    // Sort by price (ascending)
    comparisons.sort((a, b) => a.price - b.price);

    return {
      crop,
      bestMarket: comparisons[0], // Lowest price for buyers
      worstMarket: comparisons[comparisons.length - 1], // Highest price
      averagePrice: Math.round(comparisons.reduce((sum, item) => sum + item.price, 0) / comparisons.length),
      comparisons
    };
  }

  // Seasonal price prediction
  async predictSeasonalPrices(crop) {
    const seasonalPatterns = {
      'wheat': { high: 'Mar-Apr', low: 'Sep-Oct' },
      'rice': { high: 'Nov-Dec', low: 'Jul-Aug' },
      'cotton': { high: 'Dec-Jan', low: 'Jun-Jul' },
      'sugarcane': { high: 'Feb-Mar', low: 'Aug-Sep' }
    };

    const pattern = seasonalPatterns[crop];
    const currentMonth = new Date().getMonth();
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (pattern) {
      return {
        crop,
        currentSeason: this.getSeason(currentMonth),
        highSeason: pattern.high,
        lowSeason: pattern.low,
        recommendation: this.getSeasonalRecommendation(currentMonth, pattern)
      };
    }

    return {
      crop,
      currentSeason: this.getSeason(currentMonth),
      recommendation: 'No strong seasonal pattern identified for this crop'
    };
  }

  getSeason(month) {
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Monsoon';
    return 'Winter';
  }

  getSeasonalRecommendation(currentMonth, pattern) {
    const highMonths = this.parseMonthRange(pattern.high);
    const lowMonths = this.parseMonthRange(pattern.low);

    if (highMonths.includes(currentMonth)) {
      return 'Currently in high price season. Consider selling if you have stock.';
    }

    if (lowMonths.includes(currentMonth)) {
      return 'Currently in low price season. Good time for procurement.';
    }

    return 'Neutral seasonal period. Monitor market trends.';
  }

  parseMonthRange(range) {
    // Convert "Mar-Apr" to [2,3] (0-indexed months)
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                   'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    const [start, end] = range.toLowerCase().split('-');
    const startIndex = months.indexOf(start);
    const endIndex = months.indexOf(end);
    
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push(i);
    }
    return result;
  }
}

module.exports = new MarketService();