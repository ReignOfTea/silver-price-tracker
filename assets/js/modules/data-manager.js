/**
 * Handles data loading, caching, and file operations
 */
export class DataManager {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 500;
        this.apiTimeout = 5000;
    }

    /**
     * Loads data from URL with retry logic and fallback
     */
    async loadWithFallback(url, fallback, retries = this.maxRetries) {
        const controller = new AbortController();
        const { signal } = controller;

        for (let attempt = 1; attempt <= retries; attempt++) {
            const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);

            try {
                const response = await fetch(url, { signal, cache: 'no-cache' });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                if (data == null) {
                    throw new Error('Invalid JSON data received');
                }

                return data;
            } catch (error) {
                clearTimeout(timeoutId);
                console.warn(`Attempt ${attempt}/${retries} failed for ${url}:`, error.message);

                if (attempt === retries) {
                    console.error(`All attempts failed for ${url}, using fallback`);
                    return fallback;
                }

                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }

        return fallback;
    }

    /**
     * Loads all required application data
     */
    async loadAppData() {
        const [recipients, priceData] = await Promise.allSettled([
            this.loadWithFallback('data/recipients.json', {}),
            this.loadWithFallback('data/daily-prices.json', [])
        ]);

        return {
            recipients: recipients.status === 'fulfilled' ? recipients.value : {},
            dailyPrices: priceData.status === 'fulfilled' ? priceData.value : []
        };
    }

    /**
     * Gets the most recent price from historical data
     */
    async getLastKnownPrice() {
        try {
            console.log('📚 Loading last known price from daily-prices.json...');
            const dailyPrices = await this.loadWithFallback('data/daily-prices.json', [], 2);

            if (Array.isArray(dailyPrices) && dailyPrices.length > 0) {
                const lastEntry = dailyPrices[dailyPrices.length - 1];
                console.log(`✅ Found last known price: $${lastEntry.price} from ${lastEntry.date}`);

                return {
                    price: lastEntry.price,
                    source: lastEntry.source || 'historical',
                    timestamp: lastEntry.date + 'T12:00:00Z',
                    isLive: false,
                    isLastKnown: true,
                    reliable: false
                };
            }
        } catch (error) {
            console.warn('❌ Failed to load historical prices:', error);
        }

        return null;
    }
}
