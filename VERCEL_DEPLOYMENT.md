# Vercel Deployment Guide for OneMFin

## Overview
This project has been configured for Vercel deployment with both frontend and backend support.

## Project Structure
- **Frontend**: React + Vite application in `/src`
- **Backend**: Express.js API in `/backend/src`
- **API Routes**: Vercel serverless functions in `/api`

## Key Changes Made for Vercel

### 1. Image Paths
- Updated image paths from `./public/Photo1.png` to `/Photo1.png`
- Images are served from the `public` directory

### 2. Vercel Configuration
- `vercel.json`: Configures builds and routing
- Frontend builds to `dist` directory
- API routes use serverless functions

### 3. API Structure
- All API calls go through `/api/*` routes
- Backend Express app is wrapped in Vercel serverless functions
- CORS headers are properly configured

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Build the Project
```bash
npm run build:vercel
```

### 3. Deploy to Vercel
```bash
vercel
```

### 4. Set Environment Variables
In Vercel dashboard, set these environment variables:
- `NODE_ENV`: `production`
- All your existing environment variables from `.env`

### 5. Configure Domain (Optional)
- Add custom domain in Vercel dashboard
- Configure DNS settings

## Environment Variables Required
Make sure to set these in Vercel:
- `VITE_API_URL`: `https://one-moment-fin.vercel.app`
- `FRONTEND_URL`: `https://one-moment-fin.vercel.app`
- Database connection strings
- API keys (Clerk, Supabase, etc.)
- Any other sensitive configuration

## API Endpoints
After deployment, your API will be available at:
- `https://your-domain.vercel.app/api/*`
- All existing routes will work through the `/api` prefix

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed
- Check TypeScript compilation
- Verify Vite build output

### API Issues
- Check Vercel function logs
- Verify environment variables
- Test API endpoints directly

### Image Issues
- Ensure images are in `public` directory
- Check image paths in components
- Verify static file serving

## Development vs Production
- **Development**: Uses local backend server
- **Production**: Uses Vercel serverless functions
- Environment detection is automatic

## Performance Notes
- Frontend is served as static files
- API calls use serverless functions
- Images are optimized and cached
- Consider using Vercel's Edge Network for global performance
