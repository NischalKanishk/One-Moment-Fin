# OneMFin - Complete Application Summary

## 🏗️ Application Overview

**OneMFin** is a comprehensive financial advisory platform designed for Mutual Fund Distributors (MFDs) to manage leads, conduct risk assessments, and provide investment recommendations. The application uses a modern tech stack with React frontend, Node.js backend, Supabase database, and Clerk authentication.

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 7.1.1
- **UI Library**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS 3.4.17
- **State Management**: React Query (TanStack Query) 5.83.0
- **Routing**: React Router DOM 6.30.1
- **Authentication**: Clerk 5.23.0
- **Charts**: Recharts 2.15.4
- **Forms**: React Hook Form 7.61.1 with Zod validation

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 4.18.2
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk SDK Node
- **AI Integration**: OpenAI API
- **Logging**: Winston with daily rotation
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Vercel (Serverless Functions)
- **Database**: Supabase Cloud
- **Authentication**: Clerk
- **Domain**: one-moment-fin.vercel.app

## 🗄️ Database Architecture (Supabase)

### Database Password
**Password**: `SexyCylinder@1234`

### Core Tables

#### 1. Users Table
```sql
- id (UUID, Primary Key)
- clerk_id (TEXT, Unique) - Links to Clerk user ID
- full_name (TEXT, Required)
- email (TEXT, Unique)
- phone (TEXT)
- mfd_registration_number (TEXT)
- auth_provider (TEXT, Default: 'clerk')
- role (TEXT, Default: 'mfd', Options: 'mfd', 'admin')
- referral_link (TEXT, Unique)
- assessment_link (TEXT, Unique)
- profile_image_url (TEXT)
- created_at, updated_at (Timestamps)
```

#### 2. Leads Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to users.id)
- full_name (TEXT, Required)
- email (TEXT)
- phone (TEXT)
- age (INTEGER)
- source_link (TEXT, Default: 'Manually Added')
- status (TEXT, Default: 'lead', Options: 'lead', 'assessment_done', 'meeting_scheduled', 'converted', 'dropped')
- notes (TEXT)
- meeting_id (UUID, Foreign Key to meetings.id)
- risk_profile_id (UUID, Foreign Key to risk_assessments.id)
- created_at (Timestamp)
```

#### 3. Assessment Submissions Table
```sql
- id (UUID, Primary Key)
- assessment_id (UUID, Foreign Key to assessments.id)
- framework_version_id (UUID, Foreign Key to risk_framework_versions.id)
- owner_id (UUID, Foreign Key to users.id)
- lead_id (UUID, Foreign Key to leads.id)
- submitted_at (Timestamp)
- answers (JSONB) - User responses
- result (JSONB) - Scoring result
- status (TEXT, Default: 'submitted', Options: 'submitted', 'approved', 'rejected')
- review_reason (TEXT)
```

#### 4. Risk Frameworks & Questions
```sql
- risk_frameworks (Framework definitions)
- risk_framework_versions (Versioned framework configs)
- question_bank (Centralized question repository)
- framework_question_map (Framework-question mappings)
- assessment_question_snapshots (Assessment-specific questions)
```

#### 5. Assessment Links Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to users.id)
- form_id (UUID, Foreign Key to assessment_forms.id)
- version_id (UUID, Foreign Key to assessment_form_versions.id)
- lead_id (UUID, Foreign Key to leads.id)
- token (TEXT, Unique) - Shareable link token
- status (TEXT, Default: 'active', Options: 'active', 'submitted', 'expired')
- expires_at (Timestamp)
- submitted_at (Timestamp)
- created_at (Timestamp)
```

#### 6. Meetings Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to users.id)
- lead_id (UUID, Foreign Key to leads.id)
- external_event_id (TEXT)
- platform (TEXT, Options: 'google')
- meeting_link (TEXT)
- title (TEXT)
- description (TEXT)
- start_time, end_time (Timestamps)
- status (TEXT, Default: 'scheduled', Options: 'scheduled', 'completed', 'cancelled')
- is_synced (BOOLEAN, Default: false)
- created_at (Timestamp)
```

#### 7. Product Recommendations Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to users.id)
- risk_category (TEXT, Required, Options: 'low', 'medium', 'high')
- title (TEXT, Required)
- description (TEXT)
- amc_name (TEXT)
- product_type (TEXT, Options: 'equity', 'debt', 'hybrid', 'balanced')
- is_ai_generated (BOOLEAN, Default: false)
- visibility (TEXT, Default: 'public', Options: 'public', 'private')
- created_at (Timestamp)
```

### Row Level Security (RLS)
All tables have RLS enabled with policies that ensure users can only access their own data. Service role bypasses RLS for backend operations.

## 🔐 Authentication System (Clerk)

### Configuration
- **Provider**: Clerk
- **Frontend Key**: `VITE_CLERK_PUBLISHABLE_KEY`
- **Backend Key**: `CLERK_SECRET_KEY`
- **JWT Template**: Custom Supabase template for database authentication

### Authentication Flow
1. **User Registration/Login**: Handled by Clerk UI components
2. **JWT Token Generation**: Clerk generates JWT tokens with Supabase template
3. **User Sync**: `ClerkSupabaseSync` class syncs Clerk user data to Supabase
4. **Database Access**: JWT tokens used for authenticated Supabase operations

### Key Components
- **AuthContext**: Manages authentication state and user sync
- **ClerkSupabaseSync**: Handles user data synchronization
- **ProtectedRoute**: Route protection component
- **AuthRedirectHandler**: Handles authentication redirects

## 🌐 API Architecture

### Frontend API Routes (Vercel Functions)
Located in `/api/` directory:

#### 1. Leads API (`/api/leads.js`)
- `GET /api/leads` - List user leads with pagination, filtering, sorting
- `GET /api/leads/:id` - Get specific lead with assessment submissions
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `PATCH /api/leads/:id/status` - Update lead status
- `DELETE /api/leads/:id` - Delete lead
- `GET /api/leads/stats` - Get lead statistics
- `POST /api/leads/check-existing` - Check for duplicate leads
- `POST /api/leads/:id/recreate-assessment` - Recreate missing assessments

#### 2. Assessments API (`/api/assessments.js`)
- CFA Framework implementation
- Risk assessment scoring
- Question management
- Assessment submissions

#### 3. Auth API (`/api/auth.js`)
- User authentication
- Profile management
- Clerk integration

#### 4. Meetings API (`/api/[...path].js`)
- Meeting scheduling
- Google Calendar integration
- Meeting management

### Backend API Routes (Express.js)
Located in `/backend/src/routes/`:

#### 1. Authentication Routes (`/api/auth`)
- User registration/login
- Profile management
- Clerk webhook handling

#### 2. Leads Routes (`/api/leads`)
- CRUD operations for leads
- Lead analytics and statistics
- Assessment integration

#### 3. Assessments Routes (`/api/assessments`)
- Assessment form management
- Risk framework implementation
- Scoring algorithms

#### 4. Public Assessments (`/api/public-assessments`)
- Public assessment links
- Anonymous assessment taking
- Result processing

#### 5. AI Routes (`/api/ai`)
- OpenAI integration
- Investment recommendations
- Risk analysis

#### 6. Meetings Routes (`/api/meetings`)
- Meeting scheduling
- Calendar integration
- Meeting management

## 🔧 Environment Configuration

### Frontend Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_APP_URL=https://one-moment-fin.vercel.app
VITE_API_URL=https://one-moment-fin.vercel.app
```

### Backend Environment Variables
```env
# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication
CLERK_SECRET_KEY=your_clerk_secret_key

# AI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=https://one-moment-fin.vercel.app
```

## 🚀 Deployment (Vercel)

### Frontend Deployment
- **Platform**: Vercel
- **Build Command**: `npm run build:vercel`
- **Output Directory**: `dist/`
- **Framework Preset**: Vite

### Backend Deployment
- **Platform**: Vercel (Serverless Functions)
- **Build Command**: `cd backend && npm run build`
- **Output Directory**: `backend/dist/`
- **Runtime**: Node.js 18.x

### Vercel Configuration (`vercel.json`)
```json
{
  "rewrites": [
    {
      "source": "/api/leads/(.*)",
      "destination": "/api/leads.js"
    },
    {
      "source": "/api/assessments/(.*)",
      "destination": "/api/assessments.js"
    },
    {
      "source": "/api/auth/(.*)",
      "destination": "/api/auth.js"
    },
    {
      "source": "/api/(.*)",
      "destination": "/api/[...path].js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 📱 Application Features

### 1. Lead Management
- **Lead Creation**: Manual entry and bulk import
- **Lead Tracking**: Status progression (lead → assessment → meeting → conversion)
- **Lead Analytics**: Statistics and performance metrics
- **Lead Search**: Advanced filtering and search capabilities

### 2. Risk Assessment System
- **CFA Framework**: Three-pillar risk assessment (Capacity, Tolerance, Need)
- **Dynamic Forms**: JSON-based form system with versioning
- **Scoring Algorithm**: Automated risk scoring and categorization
- **Public Links**: Shareable assessment links for clients

### 3. Assessment Forms
- **Form Builder**: Visual form creation interface
- **Question Bank**: Centralized question repository
- **Version Control**: Form versioning and updates
- **Response Validation**: Schema-based validation

### 4. Meeting Management
- **Calendar Integration**: Google Calendar sync
- **Meeting Scheduling**: Automated scheduling with leads
- **Meeting Tracking**: Status and outcome tracking
- **Follow-up Management**: Post-meeting workflows

### 5. AI Integration
- **Investment Recommendations**: AI-powered product suggestions
- **Risk Analysis**: Automated risk assessment analysis
- **Content Generation**: AI-generated reports and summaries
- **Feedback System**: AI recommendation feedback collection

### 6. Analytics & Reporting
- **Dashboard**: Real-time performance metrics
- **Lead Analytics**: Conversion rates and trends
- **Assessment Analytics**: Risk profile distributions
- **Revenue Tracking**: Subscription and conversion tracking

## 🔄 Data Flow

### 1. User Authentication Flow
```
Clerk Login → JWT Token → Supabase Auth → User Sync → App Access
```

### 2. Lead Management Flow
```
Create Lead → Assessment Assignment → Risk Assessment → Meeting Scheduling → Conversion Tracking
```

### 3. Assessment Flow
```
Form Creation → Link Generation → Client Assessment → Scoring → Results → Recommendations
```

### 4. AI Recommendation Flow
```
Assessment Data → OpenAI API → Risk Analysis → Product Matching → Recommendation Generation
```

## 🛡️ Security Features

### 1. Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Row Level Security**: Database-level access control
- **Session Management**: Secure session handling
- **Multi-factor Authentication**: Clerk MFA support

### 2. Data Security
- **Encryption**: Data encryption in transit and at rest
- **Access Control**: Role-based access control (RBAC)
- **Audit Logging**: Comprehensive activity logging
- **Data Validation**: Input validation and sanitization

### 3. API Security
- **Rate Limiting**: Request rate limiting
- **CORS Protection**: Cross-origin resource sharing controls
- **Input Validation**: Request validation and sanitization
- **Error Handling**: Secure error responses

## 📊 Database Relationships

### Core Relationships
```
Users (1) ←→ (Many) Leads
Users (1) ←→ (Many) Assessment Forms
Users (1) ←→ (Many) Meetings
Users (1) ←→ (Many) Product Recommendations

Leads (1) ←→ (Many) Assessment Submissions
Leads (1) ←→ (Many) Meetings
Leads (1) ←→ (1) Risk Assessments

Assessment Forms (1) ←→ (Many) Assessment Form Versions
Assessment Forms (1) ←→ (Many) Assessment Links
Assessment Forms (1) ←→ (Many) Assessment Submissions

Risk Frameworks (1) ←→ (Many) Risk Framework Versions
Risk Framework Versions (1) ←→ (Many) Framework Question Maps
Question Bank (1) ←→ (Many) Framework Question Maps
```

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Clerk account
- OpenAI API key

### Installation Steps
1. **Clone Repository**
   ```bash
   git clone https://github.com/onemomentproducts/OneMFin.git
   cd OneMFin
   ```

2. **Install Dependencies**
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend
   npm install
   ```

3. **Environment Setup**
   - Create `.env` files with required variables
   - Configure Supabase project
   - Set up Clerk application
   - Configure OpenAI API

4. **Database Setup**
   - Run `supabase-schema.sql` in Supabase SQL editor
   - Configure RLS policies
   - Set up initial data

5. **Start Development**
   ```bash
   # Frontend (Port 8080)
   npm run dev
   
   # Backend (Port 3001)
   cd backend
   npm run dev
   ```

## 🚀 Production Deployment

### 1. Supabase Setup
- Create production Supabase project
- Run database schema
- Configure production environment variables
- Set up backup and monitoring

### 2. Clerk Setup
- Create production Clerk application
- Configure authentication settings
- Set up webhooks for user events
- Configure JWT templates

### 3. Vercel Deployment
- Connect GitHub repository to Vercel
- Configure environment variables
- Set up custom domain
- Configure build settings

### 4. Monitoring & Analytics
- Set up error tracking (Sentry)
- Configure performance monitoring
- Set up usage analytics
- Configure alerting

## 📈 Performance Optimization

### 1. Frontend Optimization
- **Code Splitting**: Route-based code splitting
- **Lazy Loading**: Component lazy loading
- **Caching**: React Query caching
- **Bundle Optimization**: Tree shaking and minification

### 2. Backend Optimization
- **Database Indexing**: Optimized database queries
- **Caching**: Redis caching for frequently accessed data
- **Connection Pooling**: Database connection optimization
- **Rate Limiting**: API rate limiting

### 3. Database Optimization
- **Query Optimization**: Efficient SQL queries
- **Indexing Strategy**: Strategic database indexing
- **Partitioning**: Large table partitioning
- **Backup Strategy**: Automated backup and recovery

## 🔍 Troubleshooting

### Common Issues
1. **Authentication Errors**: Check Clerk configuration and JWT templates
2. **Database Connection**: Verify Supabase credentials and RLS policies
3. **API Errors**: Check environment variables and rate limits
4. **Build Errors**: Verify Node.js version and dependencies

### Debug Tools
- **Frontend**: React DevTools, Network tab
- **Backend**: Winston logging, Vercel function logs
- **Database**: Supabase dashboard, SQL editor
- **Authentication**: Clerk dashboard, JWT debugger

## 📚 API Documentation

### Authentication Headers
```javascript
headers: {
  'Authorization': `Bearer ${clerkJWTToken}`,
  'Content-Type': 'application/json'
}
```

### Common Response Format
```javascript
{
  "data": {...},
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  },
  "error": null
}
```

### Error Response Format
```javascript
{
  "error": "Error message",
  "details": "Detailed error information",
  "code": "ERROR_CODE"
}
```

## 🔮 Future Enhancements

### Planned Features
1. **Mobile App**: React Native mobile application
2. **Advanced Analytics**: Machine learning insights
3. **Integration APIs**: Third-party integrations
4. **White-label Solution**: Multi-tenant architecture
5. **Advanced AI**: Custom AI models for recommendations

### Technical Improvements
1. **Microservices**: Service-oriented architecture
2. **Real-time Features**: WebSocket integration
3. **Advanced Caching**: Redis cluster setup
4. **CDN Integration**: Global content delivery
5. **Security Enhancements**: Advanced security features

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: OneMFin Development Team
