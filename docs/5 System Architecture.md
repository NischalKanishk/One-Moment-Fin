# 5. System Architecture

## Product Name: OneMFin

---

**OneMFin** is an AI-powered productivity and automation platform for **Mutual Fund Distributors (MFDs)**. It empowers MFDs to manage and convert their leads efficiently by automating risk assessment, client communication, product suggestions, and KYC collection. All in one dashboard.

The platform is designed to solve the inefficiencies that MFDs face:

- Hundreds of leads who never get proper follow-up
- Manual, time-consuming product suggestion
- Repetitive onboarding and risk profiling
- Zero centralized visibility of client interactions

With OneMFin, MFDs get a **smart dashboard** and a **public form link** to:

- Capture leads
- Automatically assess risk profiles
- Show product recommendations
- Schedule meetings
- Complete KYC
- Track client status end-to-end

## **Target Users**

---

- Independent Mutual Fund Distributors (MFDs)
- Small boutique financial advisors
- Aspiring new distributors

## **🎯 MVP Scope (Version 1)**

---

The MVP is designed to validate user needs and prove ROI through automation. It includes:

- User signup and subscription gating
- Public smart form link (customizable)
- Lead capture + risk profiling
- AI-generated product suggestions
- Meeting scheduling (Google Calendar integration)
- Basic KYC tracking
- Dashboard view with filters and lead insights
- Manual status management
- Role: MFD (admin later)

## Tech Stack

---

| Layer | **Tool** |
| --- | --- |
| Frontend | Vite + React |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI Layer | OpenAI API / Langchain for custom logic |
| Hosting | Render (Frontend)/ Railway / Supabase Edge (Backend)/ Netlify |
| 3rd Party | Google Calendar, Razorpay (future), WhatsApp API (future) |

## **Vision**

---

To become the most intelligent lead-to-investor platform built exclusively for financial intermediaries. Starting with Mutual Fund Distributors in India, OneMFin will expand into insurance, loans, and other asset distribution segments.

## **Architecture Style & Structure**

---

### **Architecture Pattern: Modular Monolith**

For MVP, OneMFin follows a **modular monolithic architecture**. All business logic, APIs, and modules are bundled into one codebase. Cleanly separated by folder structure and interfaces, allowing faster iteration and easier scaling.

It’s designed for:

- 🔁 Reusability across modules (e.g., leads, assessments, meetings)
- 🔍 Easy debugging and code traceability
- 🚀 Future transition to microservices (if needed)