import express from 'express';

const router = express.Router();

// Debug endpoint to check token format
router.get('/token-debug', async (req: express.Request, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.json({
        error: 'No authorization header',
        headers: req.headers
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.json({
        error: 'Invalid authorization header format',
        authHeader: authHeader.substring(0, 50) + '...'
      });
    }

    const token = authHeader.substring(7);
    
    return res.json({
      message: 'Token received',
      tokenLength: token.length,
      tokenPreview: token.substring(0, 50) + '...',
      tokenParts: token.split('.').length,
      isJWT: token.split('.').length === 3,
      headers: {
        authorization: authHeader.substring(0, 50) + '...',
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });
  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Debug failed',
      message: error.message 
    });
  }
});

export default router;
