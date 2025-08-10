import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
const result = dotenv.config({ path: path.join(__dirname, '../.env') });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Environment variables loaded successfully');
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { logger, httpLoggerFormat } from './services/logger';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth';
import leadsRoutes from './routes/leads';
import assessmentsRoutes from './routes/assessments';
import aiRoutes from './routes/ai';
import productsRoutes from './routes/products';
import meetingsRoutes from './routes/meetings';
import kycRoutes from './routes/kyc';
import kycTemplatesRoutes from './routes/kyc-templates';
import subscriptionRoutes from './routes/subscriptions';
import webhookRoutes from './routes/webhooks';



const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:8080', // Vite dev server
    'http://localhost:3000', // Alternative frontend port
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware -> stream to winston; rotate every minute and keep 10 minutes
app.use(morgan(httpLoggerFormat, {
  stream: {
    write: (message: string) => {
      try {
        const parsed = JSON.parse(message);
        logger.info('HTTP_ACCESS', parsed);
      } catch {
        logger.info('HTTP_ACCESS', { raw: message });
      }
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/kyc-templates', kycTemplatesRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/webhooks', webhookRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('GLOBAL_ERROR', { message: err?.message, stack: err?.stack });
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  logger.info('SERVER_START', { port: PORT, health: `/health`, apiBase: `/api` });
});

export default app;
