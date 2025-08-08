# 4. Auth Logic and Session Management

# Authentication & Session Management Design for OneMFin

Based on your OneMFin platform requirements, here's a comprehensive authentication and session management design tailored to your specific user flows and business logic.

## 1. **User Types & Authentication Requirements**

## **Distributor Authentication**

- **Primary flow:** Email/Phone + OTP (passwordless)
- **MFA:** Optional initially, but recommended for accounts handling high-value portfolios
- **Session duration:** 8 hours active, 30 days idle (with refresh tokens)

## **Lead/Client Authentication**

- **Primary flow:** One-time access via signed URLs (for forms/assessments)
- **Optional registration:** Email + OTP if they want to access their portfolio later
- **Session duration:** 2 hours for form completion, 24 hours if registered

## **Admin Authentication**

- **Primary flow:** Email + OTP + **mandatory TOTP MFA**
- **Session duration:** 4 hours active, no idle extension (must re-authenticate)

## 2. **Authentication Flow Design**

## **A. Distributor Registration & Login**

`Distributor enters email/phone on signup
2. System sends OTP (6-digit, 5min expiry)
3. CAPTCHA verification (prevent bot abuse)
4. OTP verification
5. Account creation with profile setup
6. JWT access token issued (30min expiry)
7. Refresh token stored in HTTP-only cookie (30 days)`

## **B. Lead Access Flow**

`Lead clicks distributor's custom link
2. Link validation (signature, expiry, usage limits)
3. Anonymous session created (2hr expiry)
4. Form completion (lead details, risk assessment)
5. Optional: Lead can register for portfolio access
   - If yes: OTP verification → persistent account
   - If no: Session expires after form submission`

## **C. Meeting Booking & KYC Flow**

`After risk assessment, lead books meeting
2. System generates meeting-specific signed URL
3. Meeting details sent via WhatsApp (secured endpoint)
4. Post-meeting: Distributor can send KYC link
5. KYC link: Time-limited, single-use, tied to specific lead`

## 3. **Session Management Architecture**

## **Token Strategy**

**Access Tokens (JWT):**

- Payload: **`{user_id, role, tenant_id, permissions, exp, iat}`**
- Expiry: 30 minutes
- Storage: Memory/localStorage (never in cookies for XSS protection)

**Refresh Tokens:**

- Opaque random strings stored server-side
- Expiry: 30 days (distributors), 24 hours (leads), 4 hours (admins)
- Storage: HTTP-only, Secure, SameSite=Strict cookies
- Rotation: New refresh token issued on every use

## **Session Store Design**

`javascript*// Session store structure (Redis/Database)*
{
  refresh_token_id: {
    user_id: "dist_12345",
    role: "distributor", 
    tenant_id: "tenant_67890",
    created_at: timestamp,
    expires_at: timestamp,
    last_used: timestamp,
    ip_address: "192.168.1.1",
    user_agent: "Chrome/91.0",
    revoked: false
  }
}`

## 4. **Security Implementation Details**

## **OTP Security**

- Generate cryptographically secure 6-digit codes
- Hash before storing: **`hash(otp + user_salt)`**
- Rate limiting: Max 3 OTP requests per 5 minutes per user
- Attempt limiting: Max 3 wrong OTP attempts, then 15-minute lockout
- CAPTCHA required after 2 failed attempts

## **CAPTCHA Integration**

`textOTP Request Flow:
1. User submits email/phone
2. If >2 failed attempts in last hour: Show CAPTCHA
3. Verify CAPTCHA before sending OTP
4. Generate and send OTP

OTP Verification Flow:
1. User submits OTP
2. If >1 failed attempt: Show CAPTCHA  
3. Verify CAPTCHA + OTP together
4. Issue tokens on success`

## **Signed URL Security**

For custom distributor links and meeting/KYC links:

`python*# URL structure*
https://onemfin.com/d/{distributor_id}/assess?token={signed_jwt}

*# JWT payload for signed URLs*
{
  "distributor_id": "dist_12345",
  "link_type": "assessment|meeting|kyc", 
  "usage_limit": 1, *# or N for assessment links*
  "created_for": "lead_email@domain.com", *# optional*
  "exp": timestamp,
  "nonce": "random_string"
}`

## 5. **Session Security Controls**

## **Session Validation Middleware**

Every API request must:

1. Extract JWT from Authorization header
2. Verify signature and expiry
3. Check if token is blacklisted (for logout)
4. Validate role/permissions for endpoint
5. Log access attempt

## **Refresh Token Security**

- **Rotation:** Issue new refresh token on every use
- **Reuse Detection:** If old refresh token is reused, revoke all sessions for that user
- **Binding:** Tie refresh tokens to IP + User-Agent (optional, for extra security)

## **Force Logout Scenarios**

Automatically revoke all sessions when:

- Admin requests user suspension
- Suspicious activity detected (multiple locations, unusual patterns)
- Password/email change (if you add passwords later)
- User requests "logout from all devices"

## 6. **Multi-Factor Authentication**

## **For Admins (Mandatory)**

- TOTP apps: Google Authenticator, Authy
- Backup codes: 10 single-use codes generated at MFA setup
- SMS fallback: Only if TOTP device lost, requires additional verification

## **For Distributors (Optional → Recommended)**

- Risk-based: Trigger MFA for high-value operations (bulk exports, sensitive reports)
- Progressive enhancement: Suggest MFA after 30 days or $X in managed assets

## 7. **Implementation Checklist**

## **Backend Requirements**

- [ ]  OTP generation/validation with secure random library
- [ ]  JWT signing/verification (use established library)
- [ ]  Refresh token rotation logic
- [ ]  Rate limiting middleware (per-user and per-IP)
- [ ]  CAPTCHA validation integration
- [ ]  Session revocation/blacklist management
- [ ]  Audit logging for all auth events

## **Frontend Requirements**

- [ ]  Secure token storage (memory, not localStorage)
- [ ]  Automatic token refresh logic
- [ ]  CAPTCHA integration on forms
- [ ]  Session timeout warnings
- [ ]  "Remember me" vs "Secure mode" options

## **Infrastructure Requirements**

- [ ]  Redis/cache for session storage and blacklists
- [ ]  Rate limiting at load balancer/API gateway level
- [ ]  Monitoring for auth anomalies
- [ ]  Log aggregation for security events

## 8. **Monitoring & Alerting**

**Critical Events to Monitor:**

- Multiple failed OTP attempts from same IP
- Refresh token reuse attempts
- Admin login from new location/device
- Bulk data access patterns
- Session fixation attempts

**Alert Thresholds:**

- ***10 failed logins per hour per user***
- ***5 OTP requests per 5 minutes per user***
- Admin login from country not on whitelist
- Token validation failures >100 per minute