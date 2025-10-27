import { DataManager } from './modules/data-manager.js';
import { APIManager } from './modules/api-manager.js';
import { UIRenderer } from './modules/ui-renderer.js';
import { Utils } from './modules/utils.js';

/**
 * Main Silver Gift Application - Simplified and Modular
 */
class SilverGiftApp {
    constructor() {
        this.dataManager = new DataManager();
        this.apiManager = new APIManager(this.dataManager);
        this.uiRenderer = new UIRenderer();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            await this.loadAndRender();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.uiRenderer.showError('Failed to load the application. Please refresh the page.');
        }
    }

    /**
     * Load data and render the appropriate UI
     */
    async loadAndRender() {
        const recipientId = Utils.getRecipientFromUrl();

        // Load application data
        const { recipients, dailyPrices } = await this.dataManager.loadAppData();

        // Check if valid recipient
        if (!recipientId || !recipients[recipientId]) {
            this.uiRenderer.showRecipientSelector(recipients);
            return;
        }

        // Get current price data
        const currentPriceData = await this.apiManager.getCurrentPrice();

        // Render the gift page
        this.uiRenderer.renderGiftPage(recipients[recipientId], dailyPrices, currentPriceData);
    }
}

/**
 * Global function for recipient selection
 */
window.selectRecipient = function (recipientId) {
    if (recipientId) {
        window.location.href = `?recipient=${recipientId}`;
    }
};

// Initialize when DOM is ready
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

// Global error handlers
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
