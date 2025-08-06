 
// api/stock/[symbol].js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter required' });
  }

  try {
    // Get current date for API call
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Fetch stock data from Polygon API
    const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol.toUpperCase()}/range/1/day/${dateStr}/${dateStr}?adjusted=true&sort=asc&apikey=${process.env.POLYGON_API_KEY}`;
    
    const stockResponse = await fetch(polygonUrl);
    const stockData = await stockResponse.json();

    // Also get real-time quote
    const quoteUrl = `https://api.polygon.io/v2/last/trade/${symbol.toUpperCase()}?apikey=${process.env.POLYGON_API_KEY}`;
    const quoteResponse = await fetch(quoteUrl);
    const quoteData = await quoteResponse.json();

    // Get company details
    const detailsUrl = `https://api.polygon.io/v3/reference/tickers/${symbol.toUpperCase()}?apikey=${process.env.POLYGON_API_KEY}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    // Format response
    if (stockData.results && stockData.results.length > 0) {
      const result = stockData.results[0];
      const currentPrice = quoteData.results?.p || result.c;
      const previousClose = result.c;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      const formattedData = {
        symbol: symbol.toUpperCase(),
        name: detailsData.results?.name || `${symbol.toUpperCase()} Corporation`,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: result.v,
        high: result.h,
        low: result.l,
        open: result.o,
        previousClose: previousClose,
        marketCap: detailsData.results?.market_cap || null,
        lastUpdated: new Date().toISOString(),
        source: 'polygon.io',
        liveData: true
      };

      res.status(200).json(formattedData);
    } else {
      // Fallback to simulated data if no results
      const simulatedData = generateFallbackData(symbol);
      res.status(200).json(simulatedData);
    }

  } catch (error) {
    console.error('Stock API Error:', error);
    
    // Return simulated data on error
    const fallbackData = generateFallbackData(symbol);
    res.status(200).json(fallbackData);
  }
}

function generateFallbackData(symbol) {
  const baseData = {
    'AAPL': { base: 175, name: 'Apple Inc.' },
    'MSFT': { base: 340, name: 'Microsoft Corporation' },
    'TSLA': { base: 248, name: 'Tesla Inc.' },
    'NVDA': { base: 430, name: 'NVIDIA Corporation' },
    'GOOGL': { base: 138, name: 'Alphabet Inc.' },
    'AMZN': { base: 155, name: 'Amazon.com Inc.' },
    'META': { base: 485, name: 'Meta Platforms Inc.' }
  };

  const data = baseData[symbol.toUpperCase()] || { base: 100, name: `${symbol.toUpperCase()} Corporation` };
  const volatility = 0.02;
  const timeVariation = Math.sin(Date.now() / 100000) * volatility;
  const randomVariation = (Math.random() - 0.5) * volatility * 2;
  const price = data.base * (1 + timeVariation + randomVariation);
  const change = price - data.base;
  const changePercent = (change / data.base) * 100;

  return {
    symbol: symbol.toUpperCase(),
    name: data.name,
    price: price,
    change: change,
    changePercent: changePercent,
    volume: Math.floor(Math.random() * 50000000 + 10000000),
    high: price * 1.02,
    low: price * 0.98,
    open: price * (1 + (Math.random() - 0.5) * 0.01),
    previousClose: data.base,
    marketCap: null,
    lastUpdated: new Date().toISOString(),
    source: 'simulation',
    liveData: false
  };
}