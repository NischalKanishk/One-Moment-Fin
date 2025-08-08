# Security architecture V 1.0

## 1. 🧭 Project Overview

- **Purpose:**
    
    OneMFin is a SaaS platform tailored for Mutual Fund Distributors, streamlining lead management, onboarding, risk assessment, product suggestions, KYC, portfolio tracking, and automating client communications with a strong focus on AI-driven insights and simplicity.
    
- **Technology Stack:**
    - **Frontend:** React / Next.js
    - **Backend:** Node.js / Django
    - **Database:** PostgreSQL / MongoDB
    - **Hosting/Infra:** AWS / Vercel / GCP
    - **Integrations:** WhatsApp API, KYC provider API, Email/SMS API, Payment Gateway
- **Audience:**
    
    Registered mutual fund distributors, potential clients, admin users.
    

## 2. ⚠️ Threat Modeling Summary

**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)

| **Threat** | **Example** | **Potential Impact** | **Mitigation** |
| --- | --- | --- | --- |
| Spoofing | Fake distributors/lead impersonation | High | OTP login, MFA, whitelisting |
| Tampering | Modified links/forms, fake AI suggestions | Medium | Signed URLs, strong input validation |
| Repudiation | Denying onboarding/submission steps | High | Non-repudiable audit logs, request IDs |
| Information Disclosure | Exposure of KYC, lead, meeting details | Critical | End-to-end encryption, access controls |
| Denial of Service | Spam submissions, brute force, scraping | Medium | WAF, Rate limiting, DDoS protection |
| Elevation of Privilege | Exploiting API to gain unauthorized access | Critical | RBAC, least-privilege, secure coding |

## 3. ✅ Security Requirements

- **Authentication:**
    
    Email/phone OTP, optional MFA, secure session management, JWT for API access.
    
- **Authorization:**
    
    Role/attribute-based (Distributor, Admin, System), each API endpoint protected.
    
- **Data Protection:**
    - In transit: TLS 1.2+ (enforced HSTS and secure headers)
    - At rest: AES-256 encryption (PII, KYC, portfolio, credentials)
    - Regular encrypted backups

## 4. 🧱 Secure Architecture Components

**4.1 Frontend**

- Enforce HTTPS everywhere (redirect HTTP to HTTPS)
- Use CSP/SRI and anti-XSS measures
- Validate and sanitize ALL user inputs, including dynamic forms/links
- Remove all inline JS/css, use only from whitelisted domains
- Leverage modern frameworks’ built-in security

**4.2 Backend/API**

- Strong input validation and output encoding
- Enforce rate limiting, bot/spam prevention at endpoints
- Per-user, per-IP throttling for critical APIs (onboarding, lead capture)
- Centralized authentication with JWT (short-lived) and refresh tokens (rotate frequently)
- All actions logged with non-editable audit trails (AI overrides, KYC, meeting events)

**4.3 Database**

- Encrypt sensitive data fields (PII, KYC, actions)
- Separate database roles/users (principle of least privilege)
- Use parameterized queries / ORM everywhere (no direct SQL)
- Regular, encrypted, offsite backups with restore tests

**4.4 Infrastructure**

- IAM roles (least privilege, strictly scoped)
- Firewalled API endpoints; only open required ports
- DDoS protection (WAFs like AWS Shield/Cloudflare)
- Secrets stored in vault (AWS Secrets Manager, HashiCorp Vault)
- Zero public access to admin/UAT environments

## 5. 🔐 Authentication & Authorization

| **Functionality** | **Method** |
| --- | --- |
| Distributor/User Auth | OTP (phone/email), optional MFA |
| Session Management | JWTs (short expiry), refresh tokens |
| API Access | OAuth2 scopes for third-party integrations |
| Admin Panel | Email + MFA, IP whitelisting if possible |
| WhatsApp/KYC API | OAuth or signed tokens, minimal scopes |
| Meeting links/forms | Time-bound, single-use, signed URLs |

## 6. 📈 Logging & Monitoring

- **Events to Log**: Auth attempts, link generation, KYC attempts, AI usage, admin actions, failed/successful integrations.
- **Tooling**: ELK Stack / CloudWatch / Sentry (aggregation, anomaly alerting)
- **Monitoring**: Automated alerts for:
    - Bulk KYC failures / meeting setups
    - Abnormal lead spikes
    - Multiple failed logins/IP
- **Retention**: Min. 90 days (adjust per compliance), logs encrypted at rest.

## 9. 🔄 CI/CD Security Controls

- **DevOps Process:**
    - All secrets scanned before code push (truffleHog, Gitleaks)
    - Mandatory code review/approval for all branches
    - Static checks as part of build pipeline
    - Deployments only from protected/master branches
    - Infra as Code auto-scanned for misconfigurations
    - Staging environment with non-production data for tests

## 10. 🔄 Governance & Continuous Maintenance

- Patch dependencies bi-weekly, urgent security updates immediately
- Monthly access reviews (admin, KYC, integrations)
- Full security review after every major feature launch
- Annual 3rd-party audit/Pentest
- Staff training (security awareness, incident drills, phishing tests)