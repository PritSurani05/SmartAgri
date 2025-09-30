// Global variables
let currentUser = null;
let socket = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

function initializeApp() {
    // Check if user is logged in
    const savedUser = localStorage.getItem('agri_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
    }

    // Initialize Socket.io for real-time updates
    initializeSocketIO();
    
    // Update server time
    updateServerTime();
    setInterval(updateServerTime, 1000);
}

function initializeSocketIO() {
    // Connect to backend Socket.io
    socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
        console.log('✅ Connected to backend server');
        updateConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from backend server');
        updateConnectionStatus('disconnected');
    });

    // Market data updates
    socket.on('market-data-added', (data) => {
        console.log('📈 New market data:', data);
        showRealTimeNotification('Market data updated!', 'success');
        
        // Refresh market data if on market page
        if (document.getElementById('mandi').classList.contains('active')) {
            updatePrices();
        }
    });

    socket.on('market-update', (data) => {
        console.log('📊 Market update:', data);
        updateMarketCardsRealTime(data);
    });

    // Weather updates
    socket.on('weather-update', (data) => {
        console.log('🌤️ Weather update:', data);
        updateWeatherCardsRealTime(data);
    });

    socket.on('weather-data-updated', (data) => {
        console.log('🔄 Weather data updated:', data);
        showRealTimeNotification('Weather data refreshed!', 'info');
    });
}

function updateConnectionStatus(status) {
    const statusElement = document.querySelector('.api-status .status-indicator');
    if (statusElement) {
        statusElement.style.background = status === 'connected' ? '#48bb78' : '#f56565';
    }
}

// Market Data Functions (Updated with Backend)
async function updatePrices() {
    const crop = document.getElementById('cropSelect').value;
    const market = document.getElementById('marketSelect').value;
    const priceGrid = document.getElementById('priceGrid');
    
    priceGrid.innerHTML = '<div style="text-align: center; padding: 20px;">🔄 Fetching live market data from server...</div>';
    
    try {
        // Join market room for real-time updates
        if (socket) {
            socket.emit('join-market', { crop });
        }

        const response = await agriAPI.getMarketPrices(crop, market);
        
        if (response.success) {
            displayMarketPrices(response.data);
            updatePriceChart(crop);
            updateLastSync();
        } else {
            throw new Error(response.message);
        }
        
    } catch (error) {
        console.error('Error fetching market data:', error);
        priceGrid.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #f56565;">
                ❌ Error fetching market data: ${error.message}
                <br><small>Using simulated data as fallback</small>
            </div>
        `;
        // Fallback to simulated data
        fallbackToSimulatedMarketData(crop, market);
    }
}

function displayMarketPrices(marketData) {
    const priceGrid = document.getElementById('priceGrid');
    priceGrid.innerHTML = '';

    marketData.forEach(data => {
        const card = document.createElement('div');
        card.className = 'card price-card';
        
        const trendIcon = data.trend === 'up' ? '📈' : '📉';
        const trendClass = data.trend === 'up' ? 'trend-up' : 'trend-down';
        const trendText = data.trend === 'up' ? `+${data.change}%` : `${data.change}%`;
        
        card.innerHTML = `
            <h3>${data.market.charAt(0).toUpperCase() + data.market.slice(1)} Market</h3>
            <div class="price-amount">₹${data.price}</div>
            <div class="price-trend ${trendClass}">
                ${trendIcon} ${trendText}
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 0.8rem; color: #718096;">
                <span>Volume: ${data.volume} tons</span>
                <span>Updated: ${new Date(data.lastUpdated).toLocaleTimeString()}</span>
            </div>
        `;
        
        priceGrid.appendChild(card);
    });
}

// Weather Functions (Updated with Backend)
async function updateWeather() {
    const city = document.getElementById('citySelect').value;
    const weatherGrid = document.getElementById('weatherGrid');
    
    weatherGrid.innerHTML = '<div style="text-align: center; padding: 20px;">🌐 Connecting to weather API...</div>';
    
    try {
        // Join weather room for real-time updates
        if (socket) {
            socket.emit('join-weather', { city });
        }

        const response = await agriAPI.getWeatherData(city);
        
        if (response.success) {
            displayWeatherData(response.data, response.recommendations);
            updateWeatherSyncTime();
        } else {
            throw new Error(response.message);
        }
        
    } catch (error) {
        console.error('Error fetching weather data:', error);
        weatherGrid.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #f56565;">
                ❌ Error fetching weather data: ${error.message}
                <br><small>Using simulated data as fallback</small>
            </div>
        `;
        // Fallback to simulated data
        fallbackToSimulatedWeatherData(city);
    }
}

function displayWeatherData(weatherData, recommendations) {
    const weatherGrid = document.getElementById('weatherGrid');
    weatherGrid.innerHTML = '';

    // Current weather card
    const currentCard = document.createElement('div');
    currentCard.className = 'card weather-card';
    currentCard.innerHTML = `
        <h3>Live Weather - ${weatherData.city.charAt(0).toUpperCase() + weatherData.city.slice(1)}</h3>
        <div class="weather-temp">${Math.round(weatherData.temperature)}°C</div>
        <p style="color: #4299e1; font-weight: 600; margin: 10px 0;">${weatherData.condition}</p>
        <div class="weather-details">
            <div class="weather-detail">
                <div class="weather-detail-label">Humidity</div>
                <div class="weather-detail-value">${Math.round(weatherData.humidity)}%</div>
            </div>
            <div class="weather-detail">
                <div class="weather-detail-label">Rain Chance</div>
                <div class="weather-detail-value">${Math.round(weatherData.rainfall)}%</div>
            </div>
            <div class="weather-detail">
                <div class="weather-detail-label">Wind Speed</div>
                <div class="weather-detail-value">${weatherData.windSpeed} km/h</div>
            </div>
            <div class="weather-detail">
                <div class="weather-detail-label">Pressure</div>
                <div class="weather-detail-value">${weatherData.pressure} mb</div>
            </div>
        </div>
        <div style="font-size: 0.8rem; color: #718096; margin-top: 10px; text-align: center;">
            Last updated: ${new Date(weatherData.lastUpdated).toLocaleTimeString()}
            ${weatherData.isSimulated ? '<br><small>📡 Using simulated data</small>' : ''}
        </div>
    `;
    weatherGrid.appendChild(currentCard);

    // AI Recommendations card
    if (recommendations && recommendations.length > 0) {
        const recommendationCard = document.createElement('div');
        recommendationCard.className = 'card';
        recommendationCard.innerHTML = `
            <h3>🤖 AI Farming Recommendations</h3>
            <div style="margin: 15px 0;">
                ${recommendations.map(rec => `
                    <div style="margin: 8px 0; padding: 8px; background: #f0f8ff; border-radius: 5px;">
                        <strong>${rec.message}</strong><br>
                        ${rec.recommendation}
                        ${rec.actions ? `<br><small>Actions: ${rec.actions.join(', ')}</small>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        weatherGrid.appendChild(recommendationCard);
    }
}

// Chat Functions (Updated with Backend)
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message) {
        const sessionId = document.getElementById('sessionId').textContent;
        const startTime = Date.now();
        
        addMessage(message, 'user');
        
        try {
            // Save user message to backend
            await agriAPI.saveChatMessage(sessionId, message, null, 'user');
            
            // Analyze query for better responses
            const analysis = await agriAPI.analyzeQuery(message);
            
            conversationHistory.push({type: 'user', message: message, timestamp: new Date()});
            input.value = '';
            
            showTypingIndicator();
            
            setTimeout(async () => {
                hideTypingIndicator();
                
                // Get AI response based on analysis
                const response = await getAdvancedBotResponse(message, analysis.data);
                addMessage(response, 'bot');
                
                // Save bot response to backend
                await agriAPI.saveChatMessage(sessionId, message, response, 'bot');
                
                conversationHistory.push({type: 'bot', message: response, timestamp: new Date()});
                
                const responseTime = ((Date.now() - startTime) / 1000).toFixed(1);
                document.getElementById('responseTime').textContent = `~${responseTime}s`;
                
                updateMessageCount();
                
            }, 1500 + Math.random() * 1000);
        } catch (error) {
            console.error('Error in chat:', error);
            addMessage("I'm having trouble connecting to the server. Please try again later.", 'bot');
        }
    }
}

async function getAdvancedBotResponse(message, analysis) {
    // Enhanced response generation with backend analysis
    let response = '';
    
    switch (analysis.category) {
        case 'market':
            try {
                const marketResponse = await agriAPI.getMarketAnalysis('wheat', 'delhi');
                response = `📊 Based on current market analysis: ${marketResponse.data.trendAnalysis.recommendation}`;
            } catch (error) {
                response = "I can provide market analysis. Currently, wheat prices are trending upward in Delhi markets.";
            }
            break;
            
        case 'weather':
            try {
                const weatherResponse = await agriAPI.getWeatherData();
                response = `🌤️ Current weather in ${weatherResponse.data.city}: ${weatherResponse.data.temperature}°C, ${weatherResponse.data.condition}. ${weatherResponse.recommendations[0]?.recommendation || 'Good conditions for farming.'}`;
            } catch (error) {
                response = "Weather conditions are favorable for most crops. Monitor local forecasts for updates.";
            }
            break;
            
        default:
            response = getIntelligentDefault(message);
    }
    
    return response;
}

// Knowledge Base Functions (Updated with Backend)
async function loadTips() {
    try {
        const response = await agriAPI.getArticles('all', '', 1);
        if (response.success) {
            displaySearchResults(response.data);
        }
    } catch (error) {
        console.error('Error loading articles:', error);
        fallbackToSimulatedTips();
    }
}

async function searchArticles() {
    const query = document.getElementById('searchInput').value;
    const category = document.getElementById('categoryFilter').value;
    
    if (query.length > 2 || category !== 'all') {
        try {
            const response = await agriAPI.getArticles(category, query, 1);
            if (response.success) {
                displaySearchResults(response.data);
            }
        } catch (error) {
            console.error('Error searching articles:', error);
        }
    } else {
        loadTips();
    }
}

function displaySearchResults(articles) {
    const tipsGrid = document.getElementById('tipsGrid');
    tipsGrid.innerHTML = '';
    
    if (articles.length === 0) {
        tipsGrid.innerHTML = '<div style="text-align: center; padding: 40px; color: #718096;">No articles found matching your search.</div>';
        return;
    }
    
    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'card tip-card';
        card.innerHTML = `
            <div class="tip-category">${article.category.charAt(0).toUpperCase() + article.category.slice(1)}</div>
            <h3>${article.title}</h3>
            <p style="color: #4a5568; line-height: 1.6;">${article.summary || article.content.substring(0, 150)}...</p>
            <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 0.8rem; color: #718096;">
                <span>👁️ ${article.views} views</span>
                <span>⭐ ${article.rating}/5</span>
            </div>
        `;
        tipsGrid.appendChild(card);
    });
}

// Real-time Update Functions
function updateMarketCardsRealTime(data) {
    // Update market cards with real-time data
    const priceCards = document.querySelectorAll('.price-card');
    priceCards.forEach(card => {
        // Update card data if it matches the updated market
        // Implementation depends on your specific UI structure
    });
}

function updateWeatherCardsRealTime(data) {
    // Update weather cards with real-time data
    const weatherCards = document.querySelectorAll('.weather-card');
    weatherCards.forEach(card => {
        // Update card data with new weather information
    });
}

function showRealTimeNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${bgColor};
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInDown 0.3s ease;
        font-size: 0.9rem;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Utility Functions
function updateServerTime() {
    const now = new Date();
    document.getElementById('serverTime').textContent = 
        `Server Time: ${now.toLocaleTimeString()}`;
}

function updateMessageCount() {
    const count = document.querySelectorAll('.message').length;
    document.getElementById('messageCount').textContent = count;
}

function updateLastSync() {
    document.getElementById('lastSync').textContent = new Date().toLocaleTimeString();
}

function updateWeatherSyncTime() {
    document.getElementById('weatherSync').textContent = 'Just now';
}

// Fallback functions (if backend is unavailable)
function fallbackToSimulatedMarketData(crop, market) {
    // Your existing simulated market data logic
    console.log('Using simulated market data as fallback');
}

function fallbackToSimulatedWeatherData(city) {
    // Your existing simulated weather data logic
    console.log('Using simulated weather data as fallback');
}

function fallbackToSimulatedTips() {
    // Your existing simulated tips logic
    console.log('Using simulated knowledge base as fallback');
}