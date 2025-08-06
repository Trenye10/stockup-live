 
// api/ai-analysis.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, stockData, newsData } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    // Call OpenAI API for real AI analysis
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a financial analyst AI providing stock investment advice. Analyze the provided data and user query to give actionable investment insights. Be concise but thorough.`
          },
          {
            role: 'user',
            content: `
User Query: "${query}"

Stock Data: ${stockData ? JSON.stringify(stockData) : 'Not provided'}

Recent News: ${newsData ? JSON.stringify(newsData) : 'Not provided'}

Please provide:
1. Direct answer to the user's question
2. Key reasoning based on the data
3. Risk assessment
4. Confidence level (High/Medium/Low)

Keep response under 500 words and be actionable.
            `
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });

    if (openaiResponse.ok) {
      const aiData = await openaiResponse.json();
      const analysis = aiData.choices[0].message.content;

      // Parse the response to extract structured data
      const structuredResponse = parseAIResponse(analysis, query, stockData);

      res.status(200).json({
        analysis: analysis,
        structured: structuredResponse,
        source: 'openai',
        model: 'gpt-3.5-turbo',
        timestamp: new Date().toISOString(),
        tokensUsed: aiData.usage?.total_tokens || 0
      });

    } else {
      throw new Error('OpenAI API failed');
    }

  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    // Fallback to rule-based analysis
    const fallbackAnalysis = generateFallbackAnalysis(req.body.query, req.body.stockData, req.body.newsData);
    res.status(200).json(fallbackAnalysis);
  }
}

function parseAIResponse(analysis, query, stockData) {
  const lowerQuery = query.toLowerCase();
  const lowerAnalysis = analysis.toLowerCase();
  
  // Extract recommendation
  let recommendation = 'HOLD';
  if (lowerAnalysis.includes('buy') && !lowerAnalysis.includes('don\'t buy')) {
    recommendation = lowerAnalysis.includes('strong') ? 'STRONG BUY' : 'BUY';
  } else if (lowerAnalysis.includes('sell')) {
    recommendation = lowerAnalysis.includes('strong') ? 'STRONG SELL' : 'SELL';
  }
  
  // Extract confidence
  let confidence = 'Medium';
  if (lowerAnalysis.includes('high confidence') || lowerAnalysis.includes('very confident')) {
    confidence = 'High';
  } else if (lowerAnalysis.includes('low confidence') || lowerAnalysis.includes('uncertain')) {
    confidence = 'Low';
  }
  
  // Determine color based on recommendation
  let color = '#64ffda'; // neutral
  let icon = '📊';
  
  if (recommendation.includes('BUY')) {
    color = '#10b981';
    icon = '✅';
  } else if (recommendation.includes('SELL')) {
    color = '#ef4444';
    icon = '❌';
  } else {
    color = '#f59e0b';
    icon = '⏳';
  }
  
  return {
    recommendation,
    confidence,
    color,
    icon,
    query: query
  };
}

function generateFallbackAnalysis(query, stockData, newsData) {
  const lowerQuery = query.toLowerCase();
  const isBuyQuestion = lowerQuery.includes('buy') || lowerQuery.includes('invest');
  const isSellQuestion = lowerQuery.includes('sell') || lowerQuery.includes('exit');
  
  let analysis = `Based on available market data analysis:\n\n`;
  
  if (stockData) {
    analysis += `${stockData.symbol} is currently trading at $${stockData.price.toFixed(2)}, `;
    analysis += stockData.changePercent > 0 
      ? `up ${stockData.changePercent.toFixed(2)}% today. `