class AgriAPIService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api'; // Backend URL
        this.token = localStorage.getItem('agri_token');
    }

    // Common request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        // Add auth token if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('API Request Failed:', error);
            this.showError(error.message);
            throw error;
        }
    }

    // Market APIs
    async getMarketPrices(crop = null, market = null) {
        const params = new URLSearchParams();
        if (crop) params.append('crop', crop);
        if (market) params.append('market', market);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/market/prices${query}`);
    }

    async getPriceHistory(crop, market, days = 30) {
        return this.request(`/market/history?crop=${crop}&market=${market}&days=${days}`);
    }

    async getMarketAnalysis(crop, market) {
        return this.request(`/market/analysis?crop=${crop}&market=${market}`);
    }

    // Weather APIs
    async getWeatherData(city = 'delhi') {
        return this.request(`/weather/current?city=${city}`);
    }

    async getWeatherForecast(city = 'delhi', days = 5) {
        return this.request(`/weather/forecast?city=${city}&days=${days}`);
    }

    async getWeatherAlerts(city = 'delhi') {
        return this.request(`/weather/alerts?city=${city}`);
    }

    // Knowledge Base APIs
    async getArticles(category = 'all', search = '', page = 1) {
        const params = new URLSearchParams();
        if (category !== 'all') params.append('category', category);
        if (search) params.append('search', search);
        params.append('page', page);
        
        return this.request(`/knowledge/articles?${params.toString()}`);
    }

    // Chat APIs
    async saveChatMessage(sessionId, message, response, type) {
        return this.request('/chat/message', {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
                message,
                response,
                type
            })
        });
    }

    async getChatHistory(sessionId) {
        return this.request(`/chat/history?sessionId=${sessionId}`);
    }

    async analyzeQuery(message) {
        return this.request('/chat/analyze', {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }

    // Auth APIs
    async login(email, password) {
        const result = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (result.success && result.data.token) {
            this.token = result.data.token;
            localStorage.setItem('agri_token', this.token);
            localStorage.setItem('agri_user', JSON.stringify(result.data.user));
        }

        return result;
    }

    async register(userData) {
        const result = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (result.success && result.data.token) {
            this.token = result.data.token;
            localStorage.setItem('agri_token', this.token);
            localStorage.setItem('agri_user', JSON.stringify(result.data.user));
        }

        return result;
    }

    // Utility methods
    showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f56565;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        errorDiv.textContent = `Error: ${message}`;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Global API instance
const agriAPI = new AgriAPIService();