const axios = require('axios');

// Mock prices for MVP. In production, use CoinGecko or Binance API with caching (Redis).
let prices = {
    BTC: 45000.00,
    ETH: 3000.00,
    USDT: 1.00,
    BNB: 350.00,
    TRX: 0.12
};

const getPrices = async () => {
    // Simulate slight market movement
    const volatility = 0.002; // 0.2% fluctuation

    prices.BTC = prices.BTC * (1 + (Math.random() * volatility - volatility / 2));
    prices.ETH = prices.ETH * (1 + (Math.random() * volatility - volatility / 2));
    prices.BNB = prices.BNB * (1 + (Math.random() * volatility - volatility / 2));
    prices.TRX = prices.TRX * (1 + (Math.random() * volatility - volatility / 2));

    return prices;
};

module.exports = { getPrices };
