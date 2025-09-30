const WeatherData = require('../models/WeatherData');
const weatherService = require('../services/weatherService');

exports.getWeatherData = async (req, res) => {
  try {
    const { city = 'delhi' } = req.query;
    
    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City parameter is required'
      });
    }

    // Use weather service to get real or simulated data
    const weatherData = await weatherService.fetchRealWeatherData(city);
    
    // Get AI-powered farming recommendations
    const recommendations = weatherService.getFarmingRecommendations(weatherData);
    
    // Save to database (optional)
    const savedData = new WeatherData(weatherData);
    await savedData.save();

    // Send real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`weather-${city}`).emit('weather-update', {
        data: weatherData,
        recommendations,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: weatherData,
      recommendations,
      lastUpdated: new Date(),
      source: weatherData.isSimulated ? 'simulated' : 'external_api'
    });
  } catch (error) {
    console.error('Error in getWeatherData:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weather data',
      error: error.message
    });
  }
};

exports.getWeatherForecast = async (req, res) => {
  try {
    const { city = 'delhi', days = 5 } = req.query;
    
    const forecast = await weatherService.generateForecast(city, parseInt(days));
    
    res.json({
      success: true,
      data: forecast,
      city,
      days: parseInt(days),
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error in getWeatherForecast:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating weather forecast',
      error: error.message
    });
  }
};

exports.getWeatherAlerts = async (req, res) => {
  try {
    const { city = 'delhi' } = req.query;
    
    const weatherData = await weatherService.fetchRealWeatherData(city);
    const alerts = weatherService.getFarmingRecommendations(weatherData);
    
    // Filter only high severity alerts
    const criticalAlerts = alerts.filter(alert => 
      alert.severity === 'warning' || alert.severity === 'danger'
    );

    res.json({
      success: true,
      data: {
        city,
        currentConditions: {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          rainfall: weatherData.rainfall,
          condition: weatherData.condition
        },
        alerts: criticalAlerts,
        allRecommendations: alerts
      },
      alertCount: criticalAlerts.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in getWeatherAlerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating weather alerts',
      error: error.message
    });
  }
};

exports.updateWeatherData = async (req, res) => {
  try {
    const { city, weatherData } = req.body;
    
    if (!city || !weatherData) {
      return res.status(400).json({
        success: false,
        message: 'City and weatherData are required'
      });
    }

    const updatedData = await WeatherData.findOneAndUpdate(
      { city },
      { 
        ...weatherData, 
        lastUpdated: new Date(),
        updatedBy: 'admin' // You can get from auth middleware
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(`weather-${city}`).emit('weather-data-updated', {
        data: updatedData,
        message: 'Weather data manually updated',
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Weather data updated successfully',
      data: updatedData
    });
  } catch (error) {
    console.error('Error in updateWeatherData:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating weather data',
      error: error.message
    });
  }
};

exports.getHistoricalWeather = async (req, res) => {
  try {
    const { city, days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const historicalData = await WeatherData.find({
      city,
      lastUpdated: { $gte: startDate }
    })
    .sort({ lastUpdated: 1 })
    .select('temperature humidity rainfall condition lastUpdated')
    .lean();

    res.json({
      success: true,
      data: historicalData,
      city,
      period: `${days} days`,
      recordCount: historicalData.length
    });
  } catch (error) {
    console.error('Error in getHistoricalWeather:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching historical weather data',
      error: error.message
    });
  }
};

exports.getCitiesWeather = async (req, res) => {
  try {
    const cities = ['delhi', 'mumbai', 'pune', 'bangalore', 'hyderabad', 'chennai'];
    const weatherPromises = cities.map(city => 
      weatherService.fetchRealWeatherData(city)
    );
    
    const allWeatherData = await Promise.all(weatherPromises);
    
    // Calculate averages
    const avgTemp = allWeatherData.reduce((sum, data) => sum + data.temperature, 0) / cities.length;
    const avgHumidity = allWeatherData.reduce((sum, data) => sum + data.humidity, 0) / cities.length;

    res.json({
      success: true,
      data: allWeatherData,
      summary: {
        totalCities: cities.length,
        averageTemperature: Math.round(avgTemp * 10) / 10,
        averageHumidity: Math.round(avgHumidity * 10) / 10,
        hottestCity: allWeatherData.reduce((hottest, current) => 
          current.temperature > hottest.temperature ? current : hottest
        ),
        coldestCity: allWeatherData.reduce((coldest, current) => 
          current.temperature < coldest.temperature ? current : coldest
        )
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in getCitiesWeather:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching multiple cities weather data',
      error: error.message
    });
  }
};