import { Utils } from './utils.js';

/**
 * Handles all UI rendering and DOM manipulation
 */
export class UIRenderer {
    constructor() {
        this.contentDiv = document.getElementById('content');
    }

    /**
     * Shows loading state with retry indicators
     */
    showLoadingWithRetry(currentAttempt, maxAttempts, status = 'trying') {
        if (!this.contentDiv?.classList.contains('loading')) return;

        const messages = {
            trying: `Fetching live price data (API ${currentAttempt}/${maxAttempts})`,
            waiting: `API ${currentAttempt}/${maxAttempts} failed, trying next...`
        };

        const retryInfo = currentAttempt === 0
            ? 'Connecting to price data sources'
            : messages[status] || messages.trying;

        const progressDots = Array.from(
            { length: maxAttempts },
            (_, i) => {
                let state = 'pending';
                if (i < currentAttempt - 1) state = 'completed';
                else if (i === currentAttempt - 1) state = 'current';
                return `<div class="retry-dot ${state}"></div>`;
            }
        ).join('');

        this.contentDiv.innerHTML = `
            <div class="loading-retry">
                Loading your silver gift...
                <div class="retry-info">${retryInfo}</div>
                <div class="retry-progress">${progressDots}</div>
            </div>
        `;
    }

    /**
     * Clears loading indicators
     */
    clearLoading() {
        if (this.contentDiv?.classList.contains('loading')) {
            this.contentDiv.innerHTML = `
                <div class="loading">
                    Loading your silver gift...
                </div>
            `;
        }
    }

    /**
     * Renders the main gift page
     */
    renderGiftPage(config, dailyPrices, currentPriceData) {
        this.contentDiv.classList.remove('loading');

        const timeDescription = Utils.getTimeDifference(config.giftDate);
        const silverAmount = parseFloat(config.silverAmount);
        const silverDescription = silverAmount === 1 ? '1 oz of Silver' : `${config.silverAmount} oz of Silver`;
        const formattedGiftDate = Utils.formatBritishDate(config.giftDate);

        const statusIcon = this.createStatusIcon(currentPriceData);
        const content = this.createGiftContent(config, currentPriceData, timeDescription, silverDescription, formattedGiftDate, statusIcon);

        this.contentDiv.innerHTML = content;
        this.createChart(dailyPrices, config.recipientName);
    }

    /**
     * Creates status icon based on price data
     */
    createStatusIcon(currentPriceData) {
        if (!currentPriceData?.price) {
            return `
                <div class="tooltip status-icon error">
                    <span class="tooltiptext">No price data available</span>
                </div>
            `;
        }

        let iconClass, tooltipText;

        if (currentPriceData.isLive) {
            iconClass = 'reliable';
            tooltipText = `Live price from ${currentPriceData.source}`;
        } else if (currentPriceData.isLastKnown) {
            iconClass = 'warning';
            const timeAgo = Utils.getTimeAgo(currentPriceData.timestamp);
            tooltipText = `Last known price from ${currentPriceData.source}<br>Updated: ${timeAgo}`;
        } else {
            iconClass = 'warning';
            tooltipText = `Cached price from ${currentPriceData.source}`;
        }

        return `
            <div class="tooltip status-icon ${iconClass}">
                <span class="tooltiptext">${tooltipText}</span>
            </div>
        `;
    }

    /**
     * Creates the main gift content HTML
     */
    createGiftContent(config, currentPriceData, timeDescription, silverDescription, formattedGiftDate, statusIcon) {
        if (!currentPriceData?.price) {
            return `
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
        }

        const currentValue = currentPriceData.price;
        const initialValue = config.initialPrice;
        const change = ((currentValue - initialValue) / initialValue * 100).toFixed(1);
        const changeText = change >= 0 ? `an increase of ${change}%` : `a decrease of ${Math.abs(change)}%`;

        const silverOz = parseFloat(config.silverAmount);
        const totalCurrentValue = (currentValue * silverOz).toFixed(2);

        const priceLabel = currentPriceData.isLastKnown ? 'Last known value' : 'Current value';
        const priceClass = currentPriceData.isLastKnown ? 'price last-known' : 'price';

        return `
            ${statusIcon}
            <div class="message">
                Hello <strong>${config.recipientName}</strong>,<br><br>
                ${timeDescription}, <strong>${config.giverName}</strong> gave you ${silverDescription}.<br><br>
                ${priceLabel} of that silver:
            </div>
            <div class="${priceClass}">${Utils.formatCurrency(totalCurrentValue)}</div>
            <div class="message">
                That's ${changeText} since ${formattedGiftDate}!<br>
                <small>(Silver price: $${currentValue.toFixed(2)}/oz)</small>
            </div>
            <div class="chart-container">
                <canvas id="priceChart"></canvas>
            </div>
        `;
    }

    /**
     * Creates price chart using Chart.js
     */
    createChart(dailyPrices, recipientName) {
        try {
            if (typeof Chart === 'undefined') {
                this.showFallbackChart();
                return;
            }

            if (!Array.isArray(dailyPrices) || dailyPrices.length === 0) {
                this.showNoDataChart();
                return;
            }

            const ctx = document.getElementById('priceChart');
            if (!ctx) return;

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
                        legend: { display: true }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: { display: true, text: 'Price (USD/oz)' }
                        },
                        x: {
                            title: { display: true, text: 'Date' }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating chart:', error);
            this.showFallbackChart();
        }
    }

    /**
     * Shows fallback chart message
     */
    showFallbackChart() {
        this.showChartMessage(
            '📈 Price History Chart',
            'Chart temporarily unavailable',
            'Your silver\'s value is still being tracked!'
        );
    }

    /**
     * Shows no data chart message
     */
    showNoDataChart() {
        this.showChartMessage(
            '📈 Price History Chart',
            'No historical price data available yet',
            'Check back in a few days to see your silver\'s price history!'
        );
    }

    /**
     * Shows chart message
     */
    showChartMessage(title, message, subMessage = '') {
        const chartContainer = document.querySelector('.chart-container');
        if (!chartContainer) return;

        chartContainer.innerHTML = `
            <div class="fallback-chart">
                <h3>${title}</h3>
                <p>${message}</p>
                ${subMessage ? `<p>${subMessage}</p>` : ''}
            </div>
        `;
    }

    /**
     * Shows recipient selector
     */
    showRecipientSelector(recipients) {
        this.contentDiv.classList.remove('loading');

        const recipientOptions = Object.keys(recipients)
            .map(id => `<option value="${id}">${recipients[id].recipientName}</option>`)
            .join('');

        this.contentDiv.innerHTML = `
            <div class="recipient-selector">
                <h2>Select Your Silver Gift</h2>
                <select onchange="selectRecipient(this.value)">
                    <option value="">Choose recipient...</option>
                    ${recipientOptions}
                </select>
            </div>
        `;
    }

    /**
     * Shows error message
     */
    showError(message) {
        this.contentDiv.classList.remove('loading');

        this.contentDiv.innerHTML = `
            <div class="error">
                <h3>⚠️ Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
}
