# 6. Component Breakdown

### **1. Frontend App**

*Built with Vite + React (Lovable-generated UI)*

The frontend handles all user-facing screens:

- MFD dashboard
- Lead management
- Risk assessment results
- Form customization
- Meeting and KYC tracking

The frontend communicates with the backend via RESTful APIs, handles session tokens from Supabase, and renders components conditionally based on the user’s subscription plan and lead activity.

### **2. Backend Server**

*Node.js + Express*

Handles:

- Auth middleware and session checks
- Business logic for risk analysis, KYC, leads, meetings, subscriptions
- API integration with Google, Calendly, Razorpay, and AI
- Connecting to Supabase for all DB operations
- Logging and error handling

---

### **3. Database Layer (Supabase)**

*PostgreSQL with Supabase Auth & Storage*

Includes:

- Auth system (phone/email)
- 15+ core tables (users, leads, assessments, risk, meetings, KYC, etc.)
- Supabase Storage for uploaded documents (e.g., KYC files)
- Role-based access and row-level security (optional)

---

### **4. AI Agent / Engine**

*Uses OpenAI (or LangChain) to analyze forms and recommend products*

Functions:

- Classify risk profile based on assessment answers
- Suggest mutual fund products aligned to risk level
- Auto-populate lead reports or PDF summaries (future)
- Improve via feedback stored in ai_feedback table

---

### **5. External Integrations**

| **Integration** | **Use** |
| --- | --- |
| **Calendly / Google Calendar** | Lead-to-User meeting setup and tracking |
| **WhatsApp API (future)** | Send booking confirmations, nudges, KYC links |
| **Stripe / Razorpay (future)** | Paid plan subscription management |

### **6. Admin Console (Future)**

Admin role (for internal team) to:

- Manage MFD accounts
- Monitor usage
- View lead conversion performance
- Control pricing plans