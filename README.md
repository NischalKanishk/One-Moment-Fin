# 🧠 OneMFin – Smart SaaS for Mutual Fund Distributors

**OneMFin** is a lightweight, AI-powered SaaS platform built to automate lead management, risk assessment, meeting scheduling, product suggestions, and onboarding for **Mutual Fund Distributors (MFDs)**.

It helps MFDs spend less time managing leads and more time converting them.

---

## 🔥 Features

- ✅ Smart Public Form for Lead Capture
- 🤖 AI-Based Risk Assessment Engine
- 🎯 Product Recommendation System (Custom or AI)
- 📅 Integrated Meeting Scheduler (Calendly / Google)
- 📊 Dashboard with Lead Status, KYC, Portfolio Tracking
- 📄 Quarterly Reports & Client Profiles (Planned)
- 🔐 Subscription Plans with Usage Limits
- 📥 WhatsApp/Email Integration (Planned)

---

## ⚙️ Tech Stack

| Layer        | Stack                         |
|--------------|-------------------------------|
| Frontend     | Vite + React (Lovable UI)     |
| Backend      | Node.js + Express             |
| Database     | Supabase (PostgreSQL)         |
| AI Services  | OpenAI / Langchain            |
| Deployment   | Vercel (Frontend), Railway / Supabase Functions |
| Auth         | Supabase Auth (Email / Phone) |
| 3rd Party    | Calendly, Google Calendar, Razorpay (Planned)  |

---

## 🗂️ Folder Structure

/onemfin
├── frontend/           # Vite + React app
├── backend/            # Express API logic
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middlewares/
│   └── db/
├── ai-engine/          # Risk scoring, product suggestion
├── shared/             # Constants, types, utils
└── docs/               # Specs, ERDs, Architecture

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Vercel & Railway (or Supabase Functions)

### 1. Clone the repo
```bash
git clone https://github.com/your-username/onemfin.git
cd onemfin

2. Install dependencies

cd frontend
npm install

cd ../backend
npm install

3. Set up environment variables

Create .env.local in both /frontend and /backend with the following:

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# AI
OPENAI_API_KEY=

# Calendar Webhooks
CALENDLY_SECRET=

4. Run locally

cd backend
npm run dev

cd ../frontend
npm run dev


⸻

📦 API Docs

Check docs/api-reference.md for all REST endpoints and route contracts.

⸻

🛡️ Security
	•	Supabase Auth + Row-Level Security
	•	Subscription-based feature gating
	•	Token validation middleware for all protected routes

⸻

🧠 AI Modules
	•	Risk Profile Classifier
	•	Product Match Engine
	•	Feedback Loop for AI improvement

⸻

📈 Roadmap
	•	AI Explainable Reports
	•	Razorpay Integration
	•	WhatsApp Notifications
	•	Admin Panel
	•	Team Collaboration for MFDs

⸻

🙌 Contributing

PRs welcome! See CONTRIBUTING.md for guidelines.

⸻

📄 License

MIT License

⸻

✨ Inspiration

Inspired by tools like dub.co for UX simplicity and offflight.work for visual minimalism.

⸻

Built with ❤️ by [One Moment]
- Create a lighter version for public marketing?

Let me know.
