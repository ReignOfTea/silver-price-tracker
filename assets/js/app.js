class SilverGiftApp {
    constructor() {
        this.maxRetries = 5;
        this.retryDelay = 500;
        this.apiTimeout = 5000;
        this.primaryAPI = 'https://api.gold-api.com/price/XAG';
    }

    async init() {
        try {
            await this.loadData();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load the application. Please refresh the page.');
        }
    }

    async loadData() {
        try {
            const recipientId = this.getRecipientFromUrl();

            const [recipients, priceData, currentPrice] = await Promise.allSettled([
                this.loadWithFallback('data/recipients.json', {}),
                this.loadWithFallback('data/daily-prices.json', []),
                this.getCurrentPrice()
            ]);

            const recipientsData = recipients.status === 'fulfilled' ? recipients.value : {};
            if (!recipientId || !recipientsData[recipientId]) {
                this.showRecipientSelector(recipientsData);
                return;
            }

            const dailyPrices = priceData.status === 'fulfilled' ? priceData.value : [];
            const currentPriceData = currentPrice.status === 'fulfilled' ? currentPrice.value : null;

            this.renderGiftPage(recipientsData[recipientId], dailyPrices, currentPriceData);

        } catch (error) {
            console.error('Critical error in loadData:', error);
            this.showError('Unable to load your silver gift data. Please try refreshing the page.');
        }
    }

    async loadWithFallback(url, fallback, retries = this.maxRetries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);

                const response = await fetch(url, {
                    signal: controller.signal,
                    cache: 'no-cache'
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data === null || data === undefined) {
                    throw new Error('Invalid JSON data received');
                }

                return data;

            } catch (error) {
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

    getRecipientFromUrl() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('recipient');
        } catch (error) {
            console.error('Error parsing URL parameters:', error);
            return null;
        }
    }

    async getCurrentPrice() {
        const livePrice = await this.tryLiveAPI();
        if (livePrice) {
            return livePrice;
        }

        console.warn('Live API failed, trying last known price');
        return await this.getLastKnownPrice();
    }

    async tryLiveAPI() {
        this.updateRetryIndicator(0, this.maxRetries);

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}: Trying gold-api.com...`);

                this.updateRetryIndicator(attempt, this.maxRetries);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);

                const response = await fetch(this.primaryAPI, {
                    signal: controller.signal,
                    mode: 'cors'
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                if (data.price && data.price >= 10 && data.price <= 200) {
                    console.log(`✅ Got live price from gold-api: $${data.price}`);

                    this.clearRetryIndicator();

                    return {
                        price: data.price,
                        source: 'gold-api',
                        timestamp: new Date().toISOString(),
                        isLive: true,
                        reliable: true
                    };
                } else {
                    throw new Error(`Invalid price: ${data.price}`);
                }

            } catch (error) {
                console.warn(`gold-api attempt ${attempt} failed:`, error.message);

                if (attempt < this.maxRetries) {
                    this.updateRetryIndicator(attempt, this.maxRetries, 'waiting');
                    await new Promise(resolve =>
                        setTimeout(resolve, 1000 * Math.pow(2, attempt))
                    );
                }
            }
        }

        this.clearRetryIndicator();
        return null;
    }

    updateRetryIndicator(currentAttempt, maxAttempts, status = 'trying') {
        const contentDiv = document.getElementById('content');
        if (!contentDiv || !contentDiv.classList.contains('loading')) return;

        let message, retryInfo;

        if (currentAttempt === 0) {
            message = 'Loading your silver gift...';
            retryInfo = 'Connecting to price data';
        } else if (status === 'waiting') {
            message = 'Loading your silver gift...';
            retryInfo = `Attempt ${currentAttempt}/${maxAttempts} failed, retrying...`;
        } else {
            message = 'Loading your silver gift...';
            retryInfo = `Fetching live price data (Attempt ${currentAttempt}/${maxAttempts})`;
        }

        const progressDots = Array.from({ length: maxAttempts }, (_, i) => {
            let dotClass = 'retry-dot pending';
            if (i < currentAttempt - 1) dotClass = 'retry-dot completed';
            else if (i === currentAttempt - 1) dotClass = 'retry-dot current';

            return `<div class="${dotClass}"></div>`;
        }).join('');

        contentDiv.innerHTML = `
            <div class="loading-retry">
                ${message}
                <div class="retry-info">${retryInfo}</div>
                <div class="retry-progress">${progressDots}</div>
            </div>
        `;
    }

    clearRetryIndicator() {
        const contentDiv = document.getElementById('content');
        if (contentDiv && contentDiv.classList.contains('loading')) {
            contentDiv.innerHTML = `
                <div class="loading">
                    Loading your silver gift...
                </div>
            `;
        }
    }

    async getLastKnownPrice() {
        try {
            const dailyPrices = await this.loadWithFallback('data/daily-prices.json', [], 1);
            if (Array.isArray(dailyPrices) && dailyPrices.length > 0) {
                const lastEntry = dailyPrices[dailyPrices.length - 1];
                console.log('Using last price from daily prices');
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
            console.warn('No daily prices available:', error);
        }

        return null;
    }

    /**
     * Add ordinal suffix to a number (1st, 2nd, 3rd, 4th, etc.)
     */
    getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;

        if (k >= 11 && k <= 13) {
            return num + 'th';
        }

        switch (j) {
            case 1: return num + 'st';
            case 2: return num + 'nd';
            case 3: return num + 'rd';
            default: return num + 'th';
        }
    }

    /**
     * Format date in British style: "25th Dec, 2025"
     */
    formatBritishDate(dateString) {
        try {
            const date = new Date(dateString);

            const months = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ];

            const day = date.getDate();
            const month = months[date.getMonth()];
            const year = date.getFullYear();

            return `${this.getOrdinalSuffix(day)} ${month}, ${year}`;
        } catch (error) {
            console.error('Error formatting British date:', error);
            return dateString;
        }
    }

    renderGiftPage(config, dailyPrices, currentPriceData) {
        try {
            const contentDiv = document.getElementById('content');
            contentDiv.classList.remove('loading');

            const giftDate = new Date(config.giftDate);
            const today = new Date();
            const diffTime = Math.abs(today - giftDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const years = Math.floor(diffDays / 365);
            const remainingDays = diffDays % 365;

            let timeDescription = '';
            if (years > 0 && remainingDays > 0) {
                timeDescription = `${years} ${years === 1 ? 'year' : 'years'}, ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} ago`;
            } else if (years > 0) {
                timeDescription = `${years} ${years === 1 ? 'year' : 'years'} ago`;
            } else if (remainingDays > 0) {
                timeDescription = `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} ago`;
            } else {
                timeDescription = 'today';
            }

            const silverAmount = parseFloat(config.silverAmount);
            const silverDescription = silverAmount === 1 ? '1 oz of Silver' : `${config.silverAmount} oz of Silver`;

            const formattedGiftDate = this.formatBritishDate(config.giftDate);

            let statusIcon = '';
            if (currentPriceData && currentPriceData.price) {
                let iconClass, tooltipText;

                if (currentPriceData.isLive) {
                    iconClass = 'reliable';
                    tooltipText = `Live price from ${currentPriceData.source}`;
                } else if (currentPriceData.isLastKnown) {
                    iconClass = 'warning';
                    const timeAgo = this.getTimeAgo(currentPriceData.timestamp);
                    tooltipText = `Last known price from ${currentPriceData.source}<br>Updated: ${timeAgo}`;
                } else {
                    iconClass = 'warning';
                    tooltipText = `Cached price from ${currentPriceData.source}`;
                }

                statusIcon = `
                    <div class="tooltip status-icon ${iconClass}">
                        <span class="tooltiptext">${tooltipText}</span>
                    </div>
                `;
            } else {
                statusIcon = `
                    <div class="tooltip status-icon error">
                        <span class="tooltiptext">No price data available</span>
                    </div>
                `;
            }

            let content;

            if (!currentPriceData || !currentPriceData.price) {
                content = `
                    ${statusIcon}
                    <div class="message">
                        Hello <strong>${config.recipientName}</strong>,<br><br>
                        ${timeDescription}, <strong>${config.giverName}</strong> gave you ${silverDescription}.<br><br>
                        <strong>Silver price data is temporarily unavailable.</strong><br>
                        Your silver is still valuable - we just can't show the price right now.
                    </div>
                    <div class="chart-container">
                        <canvas id="priceChart"></canvas>
                    </div>
                `;
            } else {
                const currentValue = currentPriceData.price;
                const initialValue = config.initialPrice;
                const change = ((currentValue - initialValue) / initialValue * 100).toFixed(1);
                const changeText = change >= 0 ? `an increase of ${change}%` : `a decrease of ${Math.abs(change)}%`;

                const silverOz = parseFloat(config.silverAmount);
                const totalCurrentValue = (currentValue * silverOz).toFixed(2);

                const priceLabel = currentPriceData.isLastKnown ? 'Last known value' : 'Current value';
                const priceClass = currentPriceData.isLastKnown ? 'price last-known' : 'price';

                content = `
                    ${statusIcon}
                    <div class="message">
                        Hello <strong>${config.recipientName}</strong>,<br><br>
                        ${timeDescription}, <strong>${config.giverName}</strong> gave you ${silverDescription}.<br><br>
                        ${priceLabel} of that silver:
                    </div>
                    <div class="${priceClass}">$${totalCurrentValue}</div>
                    <div class="message">
                        That's ${changeText} since ${formattedGiftDate}!<br>
                        <small>(Silver price: $${currentValue.toFixed(2)}/oz)</small>
                    </div>
                    <div class="chart-container">
                        <canvas id="priceChart"></canvas>
                    </div>
                `;
            }

            contentDiv.innerHTML = content;
            this.createChart(dailyPrices, config.recipientName);

        } catch (error) {
            console.error('Error rendering gift page:', error);
            this.showError('Error displaying your gift information.');
        }
    }

    createChart(dailyPrices, recipientName) {
        try {
            if (typeof Chart === 'undefined') {
                console.error('Chart.js not loaded');
                this.showFallbackChart();
                return;
            }

            if (!Array.isArray(dailyPrices) || dailyPrices.length === 0) {
                console.warn('No price data available for chart');
                this.showNoDataChart();
                return;
            }

            const ctx = document.getElementById('priceChart');
            if (!ctx) {
                console.error('Chart canvas not found');
                return;
            }

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dailyPrices.map(d => d.date),
                    datasets: [{
                        label: 'Silver Price (USD/oz)',
                        data: dailyPrices.map(d => d.price),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `Silver Price History - ${recipientName}'s Gift`
                        },
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Price (USD/oz)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error creating chart:', error);
            this.showFallbackChart();
        }
    }

    showFallbackChart() {
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="fallback-chart">
                    <h3>📈 Price History Chart</h3>
                    <p>Chart temporarily unavailable</p>
                    <p>Your silver's value is still being tracked!</p>
                </div>
            `;
        }
    }

    showNoDataChart() {
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="fallback-chart">
                    <h3>📈 Price History Chart</h3>
                    <p>No historical price data available yet</p>
                    <p>Check back in a few days to see your silver's price history!</p>
                </div>
            `;
        }
    }

    showRecipientSelector(recipients) {
        const contentDiv = document.getElementById('content');
        contentDiv.classList.remove('loading');

        const recipientOptions = Object.keys(recipients)
            .map(id => `<option value="${id}">${recipients[id].recipientName}</option>`)
            .join('');

        const content = `
            <div class="recipient-selector">
                <h2>Select Your Silver Gift</h2>
                <select onchange="selectRecipient(this.value)">
                    <option value="">Choose recipient...</option>
                    ${recipientOptions}
                </select>
            </div>
        `;

        contentDiv.innerHTML = content;
    }

    showError(message) {
        const contentDiv = document.getElementById('content');
        contentDiv.classList.remove('loading');

        contentDiv.innerHTML = `
            <div class="error">
                <h3>⚠️ Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()">
                    Try Again
                </button>
            </div>
        `;
    }

    getTimeAgo(timestamp) {
        if (!timestamp) return 'unknown time';

        try {
            const now = new Date();
            const then = new Date(timestamp);
            const diffMs = now - then;

            if (diffMs < 0) return 'recently';

            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMinutes < 1) return 'just now';
            if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`;

            return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`;
        } catch (error) {
            console.error('Error calculating time ago:', error);
            return 'unknown time';
        }
    }
}

function selectRecipient(recipientId) {
    if (recipientId) {
        window.location.href = `?recipient=${recipientId}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const app = new SilverGiftApp();
        app.init();
    } catch (error) {
        console.error('Critical initialization error:', error);
        document.getElementById('content').innerHTML = `
            <div class="error">
                <h3>⚠️ Critical Error</h3>
                <p>The application failed to start. Please refresh the page.</p>
            </div>
        `;
    }
});

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
