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
import publicAssessmentsRoutes from './routes/publicAssessments';
import aiRoutes from './routes/ai';

import meetingsRoutes from './routes/meetings';
import subscriptionRoutes from './routes/subscriptions';
import webhookRoutes from './routes/webhooks';
import clerkWebhookRoutes from './routes/clerkWebhooks';
import adminRoutes from './routes/admin';



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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'OneMFin Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      api: '/api',
      webhooks: '/webhooks',
      clerkWebhooks: '/webhooks/clerk',
      admin: '/api/admin'
    },
    documentation: 'Check /health for server status'
  });
});

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
app.use('/api/public-assessments', publicAssessmentsRoutes);
app.use('/api/ai', aiRoutes);

app.use('/api/meetings', meetingsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/webhooks/clerk', clerkWebhookRoutes);
app.use('/api/admin', adminRoutes);


// Public assessment routes
app.use('/a', publicAssessmentsRoutes);

// Assessment routes (for /assessment/:code)
app.use('/assessment', publicAssessmentsRoutes);

// Referral-based assessment routes
app.use('/r', publicAssessmentsRoutes);

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
