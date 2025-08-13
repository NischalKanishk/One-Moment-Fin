# 8. API & Endpoints

## **📖 OneMFin API Reference (Version 1 - MVP)**

---

### **AUTH MODULE**

| **Method** | **Endpoint** | **Auth** | **Description** |
| --- | --- | --- | --- |
| POST | /api/auth/login | ❌ | Redirects to Supabase Auth |
| POST | /api/auth/logout | ✅ | Logs out current user |
| GET | /api/auth/me | ✅ | Returns current user profile |

---

### **LEADS MODULE**

| **Method** | **Endpoint** | **Auth** | **Description** |
| --- | --- | --- | --- |
| POST | /api/leads/create | ❌ | Public lead form submission |
| GET | /api/leads | ✅ | Get all leads for logged-in MFD |
| GET | /api/leads/:id | ✅ | Get single lead + assessments + meetings |
| PATCH | /api/leads/:id/status | ✅ | Update lead status ("converted", etc.) |

---

### **RISK ASSESSMENT MODULE**

| **Method** | **Endpoint** | **Auth** | **Description** |
| --- | --- | --- | --- |
| POST | /api/assessments/submit | ❌ | Submit assessment answers |
| GET | /api/assessments/:lead_id | ✅ | Get all past assessments for lead |
| POST | /api/assessments/score | ✅ | Internal: Run AI engine scoring |

---

### **AI MODULE**

| **Method** | **Endpoint** | **Auth** | **Description** |
| --- | --- | --- | --- |
| POST | /api/ai/risk-score | ✅ | Submit answers → get score/category |
| POST | /api/ai/suggest-products | ✅ | Get AI product suggestions |

---

### **PRODUCTS MODULE**

| **Method** | **Endpoint** | **Auth** | **Description** |
| --- | --- | --- | --- |
| GET | /api/products | ✅ | List user’s product suggestions |
| POST | /api/products | ✅ | Add custom product suggestion |
| DELETE | /api/products/:id | ✅ | Remove custom product |
| GET | /api/products/recommended/:lead_id | ✅ | Get AI recommended list for a lead |

---

### **MEETINGS MODULE**

| **Method** | **Endpoint** | **Auth** | **Description** |
| --- | --- | --- | --- |
| GET | /api/meetings | ✅ | All meetings for logged-in MFD |
| POST | /api/meetings/manual | ✅ | Add manual meeting to a lead |
| PATCH | /api/meetings/:id/status | ✅ | Mark meeting as completed/cancelled |

---

### **KYC MODULE**

| **Method** | **Endpoint** | **Auth** | **Description** |
| --- | --- | --- | --- |
| GET | /api/kyc/:lead_id | ✅ | Get KYC status |
| POST | /api/kyc/upload | ✅ | Upload form or file |
| PATCH | /api/kyc/:lead_id/status | ✅ | Update KYC verification state |

---

### **AI FEEDBACK MODULE**

| **Method** | **Endpoint** | **Auth** | **Description** |
| --- | --- | --- | --- |
| POST | /api/ai-feedback | ✅ | Submit feedback on AI output |
| GET | /api/ai-feedback/:lead_id | ✅ | (Optional) show feedback history |

---

### **SUBSCRIPTIONS MODULE**

| **Method** | **Endpoint** | **Auth** | **Description** |
| --- | --- | --- | --- |
| GET | /api/subscription/plans | ❌ | Get list of pricing plans |
| POST | /api/subscription/start | ✅ | Create subscription session |
| GET | /api/subscription/current | ✅ | Get current user plan details |

---

### **WEBHOOKS**

| **Method** | **Endpoint** | **Auth** | **Description** |
| --- | --- | --- | --- |

| POST | /webhooks/stripe | 🔐 | Handle payment events |
| POST | /webhooks/google | 🔐 | Handle calendar sync (future) |

---

## **🧠 Sample Request: Submit Assessment**

```
POST /api/assessments/submit
Content-Type: application/json

{
  "lead_id": "uuid-lead-123",
  "assessment_id": "uuid-assess-456",
  "responses": [
    { "question_id": "uuid-q1", "answer_value": "Aggressive" },
    { "question_id": "uuid-q2", "answer_value": 25 }
  ]
}
```

✅ Backend will:

- Save answers
- Trigger AI scoring
- Return result

---

## **✅ Best Practices Followed**

| **Practice** | **How** |
| --- | --- |
| REST naming conventions | /api/resources/:id |
| Auth middleware | Protects sensitive routes |
| Plan gating | Middleware checks subscription status |
| Centralized error handler | All routes return consistent error shape |
| API versioning (future) | Prep for /api/v1/... |

---