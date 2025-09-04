import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
const result = dotenv.config({ path: path.join(__dirname, '../.env') });
if (result.error) {
  } else {
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
import userAssessmentLinksRoutes from './routes/userAssessmentLinks';
import aiRoutes from './routes/ai';
import notificationsRoutes from './routes/notifications';

import testRoutes from './routes/test';
import debugRoutes from './routes/debug';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://one-moment-fin.vercel.app',
    'http://localhost:5173', // Local development
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
      auth: '/api/auth',
      leads: '/api/leads',
      assessments: '/api/assessments',
      publicAssessments: '/api/public-assessments',
      ai: '/api/ai'
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
app.use('/api/notifications', notificationsRoutes);

app.use('/api/test', testRoutes);
app.use('/api/debug', debugRoutes);

// Public assessment routes
app.use('/a', userAssessmentLinksRoutes); // User assessment links (e.g., /a/1677811521d31-5477-4cf8-b718-78a64536e553RFEMC)
app.use('/api/assessment', publicAssessmentsRoutes); // Legacy assessment routes

// Referral-based assessment routes
app.use('/api/r', publicAssessmentsRoutes);

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

// Start server only if not in Vercel serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info('SERVER_START', { port: PORT, health: `/health`, apiBase: `/api` });
  });
}

export { app };
export default app;
