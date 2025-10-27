# Silver Price Tracker

A free, long-lasting website that displays live and historical silver prices for personalized gift recipients. Each recipient gets a unique URL showing their silver coin's current value and price history.


## Usage

Visit: `https://yourusername.github.io/silver-price-tracker/?recipient=john`

Replace `yourusername` with your GitHub username and `john` with the recipient ID.

## Quick Setup

1. Fork this repository
2. Go to Settings → Pages → Enable GitHub Pages
3. Your site will be live at: `https://yourusername.github.io/silver-price-tracker/`

## Configure Recipients

Edit the `data/recipients.json` file to add or remove recipients.

## Automatic Data Collection

GitHub Actions will automatically:

- ✅ Fetch daily silver prices
- ✅ Store historical data
- ✅ Handle API failures gracefully
- ✅ Run completely free on GitHub

## Adding New APIs

You can add new APIs by editing the `data/api.json` file.

The tracker uses gold-api.com by default - completely free with no authentication needed.

The JSON contains these fields:

- `name`: API name
- `url`: API URL - can include "{VARIABLE_NAME}" to insert variables from the query parameter specified in authentication below.
- `price-path`: JSON path to the price value
- `time-path`: JSON path to the time value
- `authentication`: Query parameter name for authentication token, "none" to disable authentication.
- `priority`: Priority of the API (lower is used first)
- `description`: Description of the API

## Data Storage Strategy

| File | Purpose | Update Frequency |
| --- | --- | --- |
| daily-prices.json | Recent daily prices | Daily via GitHub Actions |
| weekly-prices.json | Weekly averages | Weekly aggregation |
| monthly-prices.json | Monthly averages | Monthly aggregation |
| recipients.json | Gift recipient data | Manual updates |
| apis.json | API configurations | Manual updates |

## Local Development

```bash
# Clone your fork
git clone https://github.com/yourusername/silver-price-tracker.git
cd silver-price-tracker

# Serve locally (Python 3)
python -m http.server 8000

# Or with Node.js
npx serve .

# Visit: http://localhost:8000/?recipient=john
```

## Tech Stack

| Compontent | Tech | Why? |
| --- | --- | --- |
| Frontend | Vanilla HTML/CSS/JavaScript | No dependencies, fast loading |
| Charts | Chart.js (self-hosted) | No CDN dependencies |
| Data Storage | JSON files | Simple, version-controlled |
| Automation | GitHub Actions | Free, reliable, no server needed |
| Hosting | GitHub Pages | Free, fast, global CDN |
| APIs | Multiple fallbacks | Reliable, free options available |

## Privacy & Security

- ✅ No Personal Data: Only gift details you configure
- ✅ No Tracking: No analytics or user tracking
- ✅ No Server: Runs entirely in the browser
- ✅ Open Source: Full transparency
- ✅ API Keys: Optional, only for better rate limits
