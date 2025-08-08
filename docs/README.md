# OneMFin Documentation

## 📚 Documentation Index

### Architecture & Design
- [1. Planning and Requirement Analysis](./1%20Planning%20and%20Requirement%20Analysis.md)
- [2. Database Designs](./2%20Database%20Designs.md)
- [5. System Architecture](./5%20System%20Architecture.md)
- [6. Component Breakdown](./6%20Component%20Breakdown.md)

### Security & Authentication
- [4. Auth Logic and Session Management](./4%20Auth%20Logic%20and%20Session%20Management.md)
- [Security Architecture](./Security%20architecture%20V%201.md)

### API & Integration
- [8. API & Endpoints](./8%20API%20%26%20Endpoints.md)

## 🏗️ Project Structure

```
OneMFin/
├── src/                    # Frontend application
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── lib/               # Utilities and API
│   ├── layouts/           # Layout components
│   └── hooks/             # Custom React hooks
├── backend/               # Backend API server
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business logic
│   │   └── config/        # Configuration
│   └── dist/              # Build output
├── docs/                  # Project documentation
├── public/                # Static assets
└── supabase-schema.sql   # Database schema
```

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   cd backend && npm install
   ```

2. **Environment Setup**
   - Copy `env.example` to `.env` in root
   - Copy `backend/env.example` to `backend/.env`

3. **Database Setup**
   - Run `supabase-schema.sql` in Supabase

4. **Start Development**
   ```bash
   npm run dev          # Frontend (port 8080)
   cd backend && npm run dev  # Backend (port 3001)
   ```

## 📋 Development Guidelines

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React/TypeScript
- **Prettier**: Code formatting
- **Git Hooks**: Pre-commit linting

### Testing Strategy
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright (planned)

### Security Checklist
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CORS configuration
- [ ] Rate limiting
- [ ] Authentication middleware
- [ ] Environment variable validation

## 🔧 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
```

### Backend (Railway/Heroku)
```bash
cd backend
npm run build
npm start
```

### Environment Variables
Ensure all required environment variables are set in your deployment platform.

## 📞 Support

For technical questions or issues:
- **Email**: nischalkanishk@gmail.com
- **GitHub Issues**: Create an issue in the repository
- **Documentation**: Check this docs folder first
