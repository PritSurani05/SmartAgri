const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

router.get('/current', weatherController.getWeatherData);
router.get('/forecast', weatherController.getWeatherForecast);
router.get('/alerts', weatherController.getWeatherAlerts);
router.get('/historical', weatherController.getHistoricalWeather);
router.get('/cities', weatherController.getCitiesWeather);
router.post('/update', weatherController.updateWeatherData);

module.exports = router;