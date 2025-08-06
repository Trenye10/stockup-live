 
// api/news/[symbol].js
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
    // Get company name for better search
    const companyNames = {
      'AAPL': 'Apple',
      'MSFT': 'Microsoft',
      'GOOGL': 'Google Alphabet',
      'TSLA': 'Tesla',
      'AMZN': 'Amazon',
      'NVDA': 'NVIDIA',
      'META': 'Meta Facebook'
    };

    const searchTerm = companyNames[symbol.toUpperCase()] || symbol;
    
    // Fetch news from NewsAPI
    const newsUrl = `https://newsapi.org/v2/everything?q=${searchTerm}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${process.env.NEWS_API_KEY}`;
    
    const response = await fetch(newsUrl);
    const newsData = await response.json();

    if (newsData.articles && newsData.articles.length > 0) {
      const formattedNews = newsData.articles
        .filter(article => article.title && article.description)
        .slice(0, 5)
        .map(article => ({
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source.name,
          publishedAt: article.publishedAt,
          time: formatTimeAgo(article.publishedAt),
          sentiment: analyzeSentiment(article.title + ' ' + article.description),
          urlToImage: article.urlToImage
        }));

      res.status(200).json({
        symbol: symbol.toUpperCase(),
        articles: formattedNews,
        totalResults: newsData.totalResults,
        source: 'newsapi.org',
        lastUpdated: new Date().toISOString()
      });
    } else {
      // Fallback to simulated news
      const fallbackNews = generateFallbackNews(symbol);
      res.status(200).json(fallbackNews);
    }

  } catch (error) {
    console.error('News API Error:', error);
    
    // Return simulated news on error
    const fallbackNews = generateFallbackNews(symbol);
    res.status(200).json(fallbackNews);
  }
}

function analyzeSentiment(text) {
  const positiveWords = [
    'breakthrough', 'exceeds', 'strong', 'growth', 'upgrade', 'positive', 
    'success', 'innovation', 'record', 'beat', 'surge', 'rally', 'bullish',
    'gains', 'profits', 'revenue', 'earnings', 'outperform', 'buy', 'recommend'
  ];
  
  const negativeWords = [
    'challenges', 'decline', 'falls', 'concerns', 'negative', 'losses', 
    'downgrade', 'risks', 'fails', 'drops', 'crash', 'bearish', 'disappoints',
    'cuts', 'reduces', 'warning', 'debt', 'lawsuit', 'investigation'
  ];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function formatTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffHours > 24) return `${Math.floor(diffHours / 24)} days ago`;
  if (diffHours > 0) return `${diffHours} hours ago`;
  if (diffMins > 0) return `${diffMins} min ago`;
  return 'Just now';
}

function generateFallbackNews(symbol) {
  const newsTemplates = {
    'AAPL': [
      { title: 'Apple announces breakthrough in AI chip technology', sentiment: 'positive', source: 'TechCrunch' },
      { title: 'iPhone sales exceed expectations in Q4', sentiment: 'positive', source: 'Reuters' },
      { title: 'Apple services revenue hits new record', sentiment: 'positive', source: 'CNBC' }
    ],
    'TSLA': [
      { title: 'Tesla Cybertruck production ramps up faster than expected', sentiment: 'positive', source: 'Electrek' },
      { title: 'EV competition intensifies with new rivals', sentiment: 'negative', source: 'MarketWatch' },
      { title: 'Tesla expands Supercharger network globally', sentiment: 'positive', source: 'Tesla Blog' }
    ],
    'NVDA': [
      { title: 'NVIDIA unveils next-gen AI chips for data centers', sentiment: 'positive', source: 'VentureBeat' },
      { title: 'Major cloud providers increase NVIDIA orders', sentiment: 'positive', source: