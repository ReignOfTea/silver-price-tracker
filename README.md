# Silver Price Tracker

A free, long-lasting website that displays live and historical silver prices for personalized gift recipients. Each recipient gets a unique URL showing their silver coin's current value and price history.


## Usage

Visit: `https://yourusername.github.io/silver-price-tracker/?recipient=john`

Replace `yourusername` with your GitHub username and `john` with the recipient ID.

## Setup

1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Customize recipients in `data/recipients.json`
4. GitHub Actions will automatically fetch price data

## Technology

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Charts**: Chart.js (self-hosted)
- **Data**: GitHub Actions + JSON files
- **Hosting**: GitHub Pages (free)
- **API**: gold-api.com (free, no auth required)
