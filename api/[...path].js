// Ultra-simple API handler for Vercel
module.exports = function handler(req, res) {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    const { method, url } = req;
    
    // Simple logging
    console.log(`Request: ${method} ${url}`);
    
    // Leads endpoints are now handled by /api/leads.js
    
    // Handle health check
    if (url && url.includes('/api/health')) {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Default response
    res.status(200).json({
      message: 'API working',
      url: url,
      method: method
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Something went wrong'
    });
  }
};
