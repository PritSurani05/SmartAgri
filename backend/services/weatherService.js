const axios = require('axios');
const WeatherData = require('../models/WeatherData');

class WeatherService {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY;
    this.baseURL = 'https://api.openweathermap.org/data/2.5';
  }

  // Real weather data fetch from external API
  async fetchRealWeatherData(city) {
    try {
      const response = await axios.get(`${this.baseURL}/weather`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      const weatherData = response.data;
      
      return {
        city: city,
        temperature: Math.round(weatherData.main.temp),
        humidity: weatherData.main.humidity,
        rainfall: weatherData.rain ? weatherData.rain['1h'] || 0 : 0,
        condition: weatherData.weather[0].description,
        windSpeed: weatherData.wind.speed,
        pressure: weatherData.main.pressure,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error fetching weather data:', error.message);
      // Fallback to simulated data
      return this.generateSimulatedWeatherData(city);
    }
  }

  // Simulated data (when API fails or for development)
  generateSimulatedWeatherData(city) {
    const citiesTemp = {
      'delhi': { baseTemp: 28, baseHumidity: 65 },
      'mumbai': { baseTemp: 32, baseHumidity: 78 },
      'pune': { baseTemp: 26, baseHumidity: 60 },
      'bangalore': { baseTemp: 24, baseHumidity: 70 },
      'hyderabad': { baseTemp: 29, baseHumidity: 65 },
      'chennai': { baseTemp: 31, baseHumidity: 75 }
    };

    const base = citiesTemp[city] || { baseTemp: 27, baseHumidity: 65 };
    
    // Simulate realistic variations
    const tempVariation = (Math.random() - 0.5) * 4;
    const humidityVariation = (Math.random() - 0.5) * 10;
    
    return {
      city: city,
      temperature: Math.round(base.baseTemp + tempVariation),
      humidity: Math.max(30, Math.min(95, Math.round(base.baseHumidity + humidityVariation))),
      rainfall: Math.round(Math.random() * 50),
      condition: this.getRandomCondition(),
      windSpeed: Math.round(Math.random() * 20 + 5),
      pressure: Math.round(Math.random() * 50 + 1000),
      lastUpdated: new Date(),
      isSimulated: true // Flag to identify simulated data
    };
  }

  getRandomCondition() {
    const conditions = [
      'Clear', 'Partly Cloudy', 'Cloudy', 'Overcast', 
      'Light Rain', 'Moderate Rain', 'Heavy Rain', 'Thunderstorm'
    ];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  // Generate weather forecast
  async generateForecast(city, days = 5) {
    const forecast = [];
    const current = await this.fetchRealWeatherData(city);
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date,
        temperature: current.temperature + (Math.random() - 0.5) * 6,
        condition: this.getRandomCondition(),
        rainfall: Math.round(Math.random() * 30)
      });
    }
    
    return forecast;
  }

  // Get farming recommendations based on weather
  getFarmingRecommendations(weatherData) {
    const recommendations = [];
    const { temperature, humidity, rainfall, windSpeed } = weatherData;

    if (temperature > 35) {
      recommendations.push({
        type: 'high_temperature',
        severity: 'warning',
        message: '🌡️ High temperature alert',
        recommendation: 'Increase irrigation frequency and provide shade for sensitive crops',
        actions: ['Morning watering', 'Use shade nets', 'Avoid midday operations']
      });
    }

    if (humidity > 80) {
      recommendations.push({
        type: 'high_humidity',
        severity: 'info',
        message: '💧 High humidity detected',
        recommendation: 'Monitor for fungal diseases and ensure good air circulation',
        actions: ['Check for mildew', 'Improve ventilation', 'Avoid overhead irrigation']
      });
    }

    if (rainfall > 70) {
      recommendations.push({
        type: 'heavy_rain',
        severity: 'warning',
        message: '🌧️ Heavy rain expected',
        recommendation: 'Ensure proper drainage and delay pesticide applications',
        actions: ['Check drainage', 'Delay spraying', 'Protect soil from erosion']
      });
    }

    if (windSpeed > 20) {
      recommendations.push({
        type: 'strong_winds',
        severity: 'warning',
        message: '💨 Strong winds forecasted',
        recommendation: 'Secure tall crops and delay spraying operations',
        actions: ['Stake plants', 'Delay spraying', 'Protect young plants']
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'optimal_conditions',
        severity: 'success',
        message: '✅ Weather conditions are optimal',
        recommendation: 'Good time for regular farming activities',
        actions: ['Continue normal schedule', 'Monitor soil moisture']
      });
    }

    return recommendations;
  }
}

module.exports = new WeatherService();