# OneMFin - AI-Powered Mutual Fund Distribution Platform

OneMFin is a comprehensive SaaS platform designed for Mutual Fund Distributors (MFDs) to automate lead management, risk assessment, product suggestions, and KYC processes.

## 🚀 Features

### Core Functionality
- **Lead Management**: Capture, track, and manage leads with AI-powered insights
- **Risk Assessment**: Automated risk profiling using AI
- **Product Recommendations**: AI-driven mutual fund product suggestions
- **KYC Management**: Streamlined KYC verification process
- **Meeting Scheduling**: Integrated calendar and meeting management
- **Portfolio Tracking**: Monitor client portfolios and performance
- **Reporting**: Comprehensive analytics and reporting dashboard

### Technical Features
- **Modern Tech Stack**: React + TypeScript + Vite + Node.js + Express
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **Authentication**: Secure JWT-based authentication with Supabase Auth
- **AI Integration**: OpenAI GPT-4 for risk assessment and product recommendations
- **UI/UX**: Beautiful, responsive design with Shadcn UI components
- **Real-time Updates**: Live data synchronization
- **API-First**: RESTful API architecture

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router DOM** for routing
- **TanStack Query** for data fetching
- **Shadcn UI** for beautiful components
- **Tailwind CSS** for styling
- **Axios** for API communication

### Backend
- **Node.js** with TypeScript
- **Express.js** for API server
- **Supabase** for database and authentication
- **OpenAI API** for AI features
- **JWT** for authentication
- **Rate limiting** and security middleware

### Database
- **PostgreSQL** via Supabase
- **Real-time subscriptions**
- **Row Level Security (RLS)**
- **Automatic backups**

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

### 1. Clone the Repository
```bash
git clone https://github.com/onemomentproducts/OneMFin.git
cd OneMFin
```

### 2. Install Dependencies

#### Frontend
```bash
npm install
```

#### Backend
```bash
cd backend
npm install
```

### 3. Environment Setup

#### Frontend Environment
Create `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_APP_URL=https://one-moment-fin.vercel.app
VITE_API_URL=https://one-moment-fin.vercel.app
```

#### Backend Environment
Create `.env` file in the `backend` directory:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=https://one-moment-fin.vercel.app

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# JWT Configuration
JWT_SECRET=your_jwt_secret
```

### 4. Database Setup

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project URL and API keys

2. **Run Database Schema**:
   - Copy the contents of `supabase-schema.sql`
   - Run it in your Supabase SQL editor

3. **Configure Authentication**:
   - In Supabase Dashboard → Authentication → Settings
   - Configure email templates and settings

### 5. Start Development Servers

#### Frontend (Port 8080)
```bash
npm run dev
```

#### Backend (Port 3001)
```bash
cd backend
npm run dev
```

## 🏗️ Project Structure

```
OneMFin/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── lib/               # Utilities and API
│   └── layouts/           # Layout components
├── backend/               # Backend source code
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business logic
│   │   └── config/        # Configuration
│   └── dist/              # Build output
├── Documentation/         # Project documentation
├── supabase-schema.sql   # Database schema
└── README.md             # This file
```

## 🔧 Development

### Available Scripts

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

#### Backend
```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm start           # Start production server
```

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get user profile

#### Leads
- `POST /api/leads/create` - Create new lead
- `GET /api/leads` - Get all leads
- `GET /api/leads/:id` - Get specific lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

#### Assessments
- `POST /api/assessments/submit` - Submit risk assessment
- `GET /api/assessments/:lead_id` - Get lead assessments
- `GET /api/assessments/forms` - Get assessment forms

#### AI
- `POST /api/ai/risk-score` - Get AI risk assessment
- `POST /api/ai/suggest-products` - Get product recommendations

## 🚀 Deployment

### Frontend Deployment
1. Build the project: `npm run build`
2. Deploy to Vercel, Netlify, or any static hosting

### Backend Deployment
1. Build the project: `npm run build`
2. Deploy to Railway, Heroku, or any Node.js hosting

### Environment Variables
Make sure to set all required environment variables in your deployment platform.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Nischal Kanishk**
- Email: nischalkanishk@gmail.com
- GitHub: [@nischalkanishk](https://github.com/nischalkanishk)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the backend-as-a-service
- [OpenAI](https://openai.com) for AI capabilities
- [Shadcn UI](https://ui.shadcn.com) for beautiful components
- [Vite](https://vitejs.dev) for fast development
- [React](https://reactjs.org) for the frontend framework

## 📞 Support

For support, email nischalkanishk@gmail.com or create an issue in this repository.
