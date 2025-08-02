// pages/api/swap.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Set JSON content type
  res.setHeader('Content-Type', 'application/json');

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { src, dst, amount, from, slippage = '1', receiver } = req.query;

    // Validate required parameters
    if (!src || !dst || !amount || !from) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Call 1inch API
    const apiUrl = `https://api.1inch.dev/swap/v6.1/1/swap?` +
      `src=${encodeURIComponent(src)}` +
      `&dst=${encodeURIComponent(dst)}` +
      `&amount=${encodeURIComponent(amount)}` +
      `&from=${encodeURIComponent(from)}` +
      `&slippage=${encodeURIComponent(slippage)}` +
      (receiver ? `&receiver=${encodeURIComponent(receiver)}` : '');

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONE_INCH_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`1inch API error: ${error}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}