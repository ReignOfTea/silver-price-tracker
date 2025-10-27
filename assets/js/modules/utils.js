/**
 * Utility functions for the Silver Gift Tracker
 */
export class Utils {
    static months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    /**
     * Converts a number to its ordinal form (1st, 2nd, 3rd, etc.)
     */
    static getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;

        if (k >= 11 && k <= 13) return num + 'th';

        switch (j) {
            case 1: return num + 'st';
            case 2: return num + 'nd';
            case 3: return num + 'rd';
            default: return num + 'th';
        }
    }

    /**
     * Formats a date string in British style (e.g., '25th Dec, 2025')
     */
    static formatBritishDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;

            const day = date.getDate();
            const month = Utils.months[date.getMonth()];
            const year = date.getFullYear();

            return `${Utils.getOrdinalSuffix(day)} ${month}, ${year}`;
        } catch (error) {
            console.error('Error formatting British date:', error);
            return dateString;
        }
    }

    /**
     * Formats a number as USD currency
     */
    static formatCurrency(amount) {
        return parseFloat(amount).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
    }

    /**
     * Calculates time elapsed since a given timestamp
     */
    static getTimeAgo(timestamp) {
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

    /**
     * Extracts recipient ID from URL query parameters
     */
    static getRecipientFromUrl() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('recipient');
        } catch (error) {
            console.error('Error parsing URL parameters:', error);
            return null;
        }
    }

    /**
     * Calculates time description between two dates
     */
    static getTimeDifference(giftDate) {
        const today = new Date();
        const diffTime = Math.abs(today - new Date(giftDate));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const years = Math.floor(diffDays / 365);
        const remainingDays = diffDays % 365;

        if (years > 0 && remainingDays > 0) {
            return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} ago`;
        } else if (years > 0) {
            return `${years} ${years === 1 ? 'year' : 'years'} ago`;
        } else if (remainingDays > 0) {
            return `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} ago`;
        } else {
            return 'today';
        }
    }
}
