/**
 * Manages API configurations and price fetching
 */
export class APIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.apiTimeout = 5000;
    }

    /**
     * Loads and processes API configuration
     */
    async loadAPIConfig() {
        try {
            console.log('🔄 Loading API configuration...');
            const config = await this.dataManager.loadWithFallback('data/apis.json', null, 2);

            if (!config || !Array.isArray(config)) {
                console.warn('⚠️ APIs config invalid, using fallback');
                return this.getFallbackAPIConfig();
            }

            const availableAPIs = config
                .sort((a, b) => a.priority - b.priority)
                .filter(api => this.isAPIAvailable(api));

            console.log(`✅ Loaded ${availableAPIs.length} available APIs:`, availableAPIs.map(api => api.name));

            return availableAPIs.length > 0 ? availableAPIs : this.getFallbackAPIConfig();
        } catch (error) {
            console.warn('❌ Failed to load API config:', error);
            return this.getFallbackAPIConfig();
        }
    }

    /**
     * Checks if API is available based on authentication
     */
    isAPIAvailable(api) {
        if (api.authentication === 'none') return true;

        const urlParams = new URLSearchParams(window.location.search);
        const hasKey = urlParams.has(api.authentication);

        if (!hasKey) {
            console.log(`⏭️ Skipping ${api.name} - requires ${api.authentication} key`);
        }

        return hasKey;
    }

    /**
     * Provides fallback API configuration
     */
    getFallbackAPIConfig() {
        return [{
            name: "gold-api",
            url: "https://api.gold-api.com/price/XAG",
            "price-path": "price",
            "time-path": "updatedAt",
            authentication: "none",
            priority: 1,
            description: "Fallback API configuration"
        }];
    }

    /**
     * Builds API URL with authentication
     */
    buildAPIUrl(api) {
        let url = api.url;

        if (api.authentication !== 'none') {
            const urlParams = new URLSearchParams(window.location.search);
            const apiKey = urlParams.get(api.authentication);

            if (!apiKey) {
                throw new Error(`Missing API key for ${api.name}: ${api.authentication}`);
            }

            url = url.replace(`{${api.authentication}}`, apiKey);
        }

        return url;
    }

    /**
     * Parses JSON path for complex key structures
     */
    parseJSONPath(pathString) {
        const complexPaths = {
            "Global Quote.05. price": ["Global Quote", "05. price"],
            "Global Quote.07. latest trading day": ["Global Quote", "07. latest trading day"],
            "rates.XAG": ["rates", "XAG"],
            "rates.USDXAG": ["rates", "USDXAG"]
        };

        if (complexPaths[pathString]) {
            return complexPaths[pathString];
        }

        if (pathString.includes('Global Quote')) {
            const parts = pathString.split('Global Quote.');
            if (parts.length === 2) {
                return ['Global Quote', parts[1]];
            }
        }

        return pathString.split('.');
    }

    /**
     * Extracts price from API response
     */
    extractPrice(data, api) {
        try {
            const path = this.parseJSONPath(api['price-path']);
            let value = data;

            for (const key of path) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    console.warn(`Path segment "${key}" not found`);
                    return null;
                }
            }

            let price = parseFloat(value);

            if (isNaN(price)) return null;

            if (api.rate_conversion === 'invert') {
                price = 1 / price;
            }

            return price;
        } catch (error) {
            console.warn(`Failed to extract price from ${api.name}:`, error);
            return null;
        }
    }

    /**
     * Attempts to get current price from all available APIs
     */
    async getCurrentPrice() {
        console.log('🎯 Starting price fetch...');

        // Try live APIs first
        const livePrice = await this.tryAllLiveAPIs();
        if (livePrice) return livePrice;

        // Fallback to last known price
        console.log('📚 Trying last known price...');
        return await this.dataManager.getLastKnownPrice();
    }

    /**
     * Tries all configured APIs
     */
    async tryAllLiveAPIs() {
        const apiConfigs = await this.loadAPIConfig();

        console.log(`🔄 Trying ${apiConfigs.length} APIs...`);

        for (let i = 0; i < apiConfigs.length; i++) {
            const api = apiConfigs[i];

            try {
                console.log(`🔄 API ${i + 1}/${apiConfigs.length}: ${api.name}...`);

                const result = await this.tryIndividualAPI(api);
                if (result) {
                    console.log(`✅ SUCCESS: ${api.name} - $${result.price}`);
                    return result;
                }
            } catch (error) {
                console.warn(`❌ ${api.name} failed:`, error.message);
            }

            if (i < apiConfigs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return null;
    }

    /**
     * Tries individual API with retries
     */
    async tryIndividualAPI(api) {
        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const url = this.buildAPIUrl(api);
                const headers = api.headers || {};

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);

                const response = await fetch(url, {
                    signal: controller.signal,
                    mode: 'cors',
                    headers: headers
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                const price = this.extractPrice(data, api);

                if (price && price >= 10 && price <= 200) {
                    return {
                        price: price,
                        source: api.name,
                        timestamp: new Date().toISOString(),
                        isLive: true,
                        reliable: true
                    };
                } else {
                    throw new Error(`Invalid price: ${price}`);
                }

            } catch (error) {
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                }
            }
        }

        return null;
    }
}
