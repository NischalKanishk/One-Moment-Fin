export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      onboardingComplete?: boolean
      phoneNumber?: string
      mfdRegistrationNumber?: string
      calendlyUrl?: string
      calendlyApiKey?: string
    }
  }
}
