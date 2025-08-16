import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../backend/src/index';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Convert Vercel request/response to Express-compatible format
  const expressReq = {
    ...req,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    originalUrl: req.url,
  };
  
  const expressRes = {
    ...res,
    status: (code: number) => {
      res.status(code);
      return expressRes;
    },
    json: (data: any) => {
      res.json(data);
      return expressRes;
    },
    send: (data: any) => {
      res.send(data);
      return expressRes;
    },
    end: (data?: any) => {
      res.end(data);
      return expressRes;
    },
    setHeader: (name: string, value: string) => {
      res.setHeader(name, value);
      return expressRes;
    },
  };
  
  // Route the request through the Express app
  app(expressReq as any, expressRes as any);
}
