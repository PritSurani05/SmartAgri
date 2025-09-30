const MarketData = require('../models/MarketData');
const marketService = require('../services/marketService');

exports.getMarketPrices = async (req, res) => {
  try {
    const { crop, market, limit = 50 } = req.query;
    
    let query = {};
    if (crop) query.crop = crop;
    if (market) query.market = market;
    
    const prices = await MarketData.find(query)
      .sort({ lastUpdated: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // If no data found, generate simulated data
    if (prices.length === 0 && crop && market) {
      const simulatedData = marketService.generateMarketData(crop, market);
      if (simulatedData) {
        const newData = new MarketData(simulatedData);
        await newData.save();
        prices.push(simulatedData);
      }
    }

    res.json({
      success: true,
      data: prices,
      count: prices.length,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error in getMarketPrices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching market data',
      error: error.message
    });
  }
};

exports.getPriceHistory = async (req, res) => {
  try {
    const { crop, market, days = 30 } = req.query;
    
    if (!crop || !market) {
      return res.status(400).json({
        success: false,
        message: 'Crop and market parameters are required'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const history = await MarketData.find({
      crop,
      market,
      lastUpdated: { $gte: startDate }
    })
    .sort({ lastUpdated: 1 })
    .select('price lastUpdated trend change volume')
    .lean();

    res.json({
      success: true,
      data: history,
      crop,
      market,
      period: `${days} days`,
      recordCount: history.length,
      priceRange: history.length > 0 ? {
        min: Math.min(...history.map(h => h.price)),
        max: Math.max(...history.map(h => h.price)),
        current: history[history.length - 1]?.price
      } : null
    });
  } catch (error) {
    console.error('Error in getPriceHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching price history',
      error: error.message
    });
  }
};

exports.addMarketData = async (req, res) => {
  try {
    const marketData = new MarketData(req.body);
    await marketData.save();
    
    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`market-${marketData.crop}`).emit('market-data-added', {
        data: marketData,
        message: 'New market data added',
        timestamp: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Market data added successfully',
      data: marketData
    });
  } catch (error) {
    console.error('Error in addMarketData:', error);
    res.status(400).json({
      success: false,
      message: 'Error adding market data',
      error: error.message
    });
  }
};

exports.getMarketStats = async (req, res) => {
  try {
    const stats = await MarketData.aggregate([
      {
        $group: {
          _id: '$crop',
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          totalRecords: { $sum: 1 },
          markets: { $addToSet: '$market' }
        }
      },
      {
        $project: {
          crop: '$_id',
          avgPrice: { $round: ['$avgPrice', 2] },
          minPrice: 1,
          maxPrice: 1,
          totalRecords: 1,
          marketCount: { $size: '$markets' },
          priceRange: { $subtract: ['$maxPrice', '$minPrice'] }
        }
      }
    ]);
    
    const totalStats = await MarketData.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          uniqueCrops: { $addToSet: '$crop' },
          uniqueMarkets: { $addToSet: '$market' },
          overallAvgPrice: { $avg: '$price' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        cropStats: stats,
        overallStats: totalStats[0] ? {
          totalRecords: totalStats[0].totalRecords,
          uniqueCrops: totalStats[0].uniqueCrops.length,
          uniqueMarkets: totalStats[0].uniqueMarkets.length,
          overallAvgPrice: Math.round(totalStats[0].overallAvgPrice * 100) / 100
        } : null
      }
    });
  } catch (error) {
    console.error('Error in getMarketStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching market statistics',
      error: error.message
    });
  }
};

exports.getMarketAnalysis = async (req, res) => {
  try {
    const { crop, market, days = 30 } = req.query;
    
    if (!crop || !market) {
      return res.status(400).json({
        success: false,
        message: 'Crop and market parameters are required'
      });
    }

    const trendAnalysis = await marketService.analyzePriceTrends(crop, market, parseInt(days));
    const marketComparison = await marketService.compareMarkets(crop);
    const seasonalPrediction = await marketService.predictSeasonalPrices(crop);

    res.json({
      success: true,
      data: {
        basicInfo: { crop, market, analysisPeriod: `${days} days` },
        trendAnalysis,
        marketComparison,
        seasonalPrediction,
        aiInsights: {
          bestAction: this.getBestAction(trendAnalysis, seasonalPrediction),
          riskLevel: this.calculateRiskLevel(trendAnalysis),
          confidence: trendAnalysis.confidence
        }
      },
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error in getMarketAnalysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing market data',
      error: error.message
    });
  }
};

exports.getBestDeals = async (req, res) => {
  try {
    const { crop } = req.query;
    
    let query = {};
    if (crop) query.crop = crop;

    // Get latest prices for all markets
    const latestData = await MarketData.aggregate([
      { $match: query },
      { $sort: { lastUpdated: -1 } },
      {
        $group: {
          _id: { crop: '$crop', market: '$market' },
          latestDoc: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$latestDoc' } },
      { $sort: { price: 1 } }
    ]);

    // Group by crop and find best deals
    const dealsByCrop = latestData.reduce((acc, item) => {
      if (!acc[item.crop]) {
        acc[item.crop] = [];
      }
      acc[item.crop].push(item);
      return acc;
    }, {});

    // Find best and worst markets for each crop
    const bestDeals = Object.entries(dealsByCrop).map(([crop, data]) => {
      const sorted = data.sort((a, b) => a.price - b.price);
      return {
        crop,
        bestMarket: sorted[0], // Lowest price
        worstMarket: sorted[sorted.length - 1], // Highest price
        priceDifference: sorted[sorted.length - 1].price - sorted[0].price,
        priceDifferencePercent: ((sorted[sorted.length - 1].price - sorted[0].price) / sorted[0].price * 100).toFixed(2),
        availableMarkets: sorted.length
      };
    });

    res.json({
      success: true,
      data: bestDeals,
      totalCrops: bestDeals.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in getBestDeals:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding best deals',
      error: error.message
    });
  }
};

// Helper methods
exports.getBestAction = (trendAnalysis, seasonalPrediction) => {
  if (trendAnalysis.trend === 'up' && trendAnalysis.confidence > 70) {
    return 'SELL';
  } else if (trendAnalysis.trend === 'down' && trendAnalysis.confidence > 70) {
    return 'BUY';
  } else if (seasonalPrediction.recommendation.includes('high price season')) {
    return 'SELL';
  } else if (seasonalPrediction.recommendation.includes('low price season')) {
    return 'BUY';
  } else {
    return 'HOLD';
  }
};

exports.calculateRiskLevel = (trendAnalysis) => {
  if (trendAnalysis.confidence > 80) return 'LOW';
  if (trendAnalysis.confidence > 60) return 'MEDIUM';
  if (trendAnalysis.confidence > 40) return 'HIGH';
  return 'VERY_HIGH';
};