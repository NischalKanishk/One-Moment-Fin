# OneMFin Backend API

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
1. Copy `env.example` to `.env`
2. Fill in your environment variables:
   - Get Supabase Service Role Key from your Supabase dashboard
   - Add your OpenAI API key
   - Configure other optional integrations

### 3. Database Setup
Make sure you've run the Supabase schema from the main project:
```sql
-- Run the contents of supabase-schema.sql in your Supabase SQL Editor
```

### 4. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Leads
- `POST /api/leads/create` - Create new lead (public)
- `GET /api/leads` - Get all leads for user
- `GET /api/leads/:id` - Get specific lead
- `PATCH /api/leads/:id/status` - Update lead status
- `GET /api/leads/stats` - Get lead statistics

### Assessments
- `POST /api/assessments/submit` - Submit risk assessment (public)
- `GET /api/assessments/:lead_id` - Get assessments for lead
- `POST /api/assessments/score` - AI risk scoring
- `GET /api/assessments/forms` - Get user's assessment forms
- `POST /api/assessments/forms` - Create assessment form

### AI
- `POST /api/ai/risk-score` - Get AI risk assessment
- `POST /api/ai/suggest-products` - Get AI product suggestions

### Products
- `GET /api/products` - Get user's products
- `POST /api/products` - Add custom product
- `DELETE /api/products/:id` - Remove product
- `GET /api/products/recommended/:lead_id` - Get recommended products

### Meetings
- `GET /api/meetings` - Get all meetings
- `POST /api/meetings/manual` - Create manual meeting
- `PATCH /api/meetings/:id/status` - Update meeting status

### KYC
- `GET /api/kyc/:lead_id` - Get KYC status
- `POST /api/kyc/upload` - Upload KYC data
- `PATCH /api/kyc/:lead_id/status` - Update KYC status

### Subscriptions
- `GET /api/subscription/plans` - Get available plans
- `GET /api/subscription/current` - Get current subscription
- `POST /api/subscription/start` - Start subscription

### Webhooks
- `POST /webhooks/calendly` - Calendly webhook
- `POST /webhooks/stripe` - Stripe webhook
- `POST /webhooks/google` - Google Calendar webhook

## Features

### ✅ Implemented
- Complete authentication system with Supabase
- Lead management with full CRUD operations
- AI-powered risk assessment using OpenAI
- Product recommendation system
- Meeting scheduling and management
- KYC status tracking
- Subscription plan management
- Webhook support for external integrations

### 🔧 Security Features
- JWT-based authentication
- Rate limiting on all endpoints
- Input validation with express-validator
- CORS configuration
- Helmet security headers
- Row Level Security (RLS) in database

### 🤖 AI Integration
- Risk assessment using GPT-4
- Product recommendations based on risk profile
- Lead summary generation
- Configurable AI prompts

## Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build for production
- `npm start` - Start production server

### Project Structure
```
src/
├── config/
│   └── supabase.ts      # Supabase configuration
├── middleware/
│   └── auth.ts          # Authentication middleware
├── routes/
│   ├── auth.ts          # Authentication routes
│   ├── leads.ts         # Lead management
│   ├── assessments.ts   # Risk assessments
│   ├── ai.ts           # AI endpoints
│   ├── products.ts     # Product management
│   ├── meetings.ts     # Meeting management
│   ├── kyc.ts         # KYC management
│   ├── subscriptions.ts # Subscription management
│   └── webhooks.ts     # External webhooks
├── services/
│   └── ai.ts           # AI service
└── index.ts            # Main server file
```

## Next Steps

1. **Get Supabase Service Role Key** from your Supabase dashboard
2. **Set up environment variables** in `.env`
3. **Test the API** with tools like Postman or curl
4. **Connect frontend** to the backend APIs
5. **Add external integrations** (Calendly, Stripe, etc.)

## Testing

Test the health endpoint:
```bash
curl http://localhost:3001/health
```

Test authentication:
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'
```
