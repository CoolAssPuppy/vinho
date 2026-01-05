# Vinho Authentication Setup Checklist

This document contains all manual configuration steps required to enable authentication features in Vinho for both web and iOS.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [HCaptcha Configuration](#2-hcaptcha-configuration)
3. [Supabase Auth Settings](#3-supabase-auth-settings)
4. [OAuth Providers](#4-oauth-providers)
5. [Email Templates](#5-email-templates)
6. [Web Configuration](#6-web-configuration)
7. [iOS Configuration](#7-ios-configuration)
8. [Verification Checklist](#8-verification-checklist)

---

## 1. Prerequisites

### 1.1 Environment Variables

Confirm these environment variables are present (via Doppler or `.env.local`):

**Web:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`
- `VINHO_SERVICE_ROLE_KEY` (for account deletion API)

**iOS:**
- `VINHO_WEB_BASE_URL` (set to `https://vinho.dev` for production)
- Supabase URL and anon key (via Doppler or plist)

### 1.2 Supabase Redirect URLs

- [ ] Go to Supabase Auth > Settings > Redirect URLs
- [ ] Add these URLs (one per line):
  - `https://vinho.dev/auth/callback`
  - `https://vinho.dev/auth/update-password`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/update-password`
  - `vinho://auth-callback`

---

## 2. HCaptcha Configuration

### 2.1 Create HCaptcha Account

- [ ] Go to [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
- [ ] Create an account or sign in
- [ ] Create a new site for Vinho
- [ ] Note your **Site Key** (public)
- [ ] Note your **Secret Key** (private)

### 2.2 Configure HCaptcha in Supabase

- [ ] Go to Supabase Dashboard > Authentication > Captcha Protection
- [ ] Enable Captcha protection
- [ ] Select "hCaptcha" as the provider
- [ ] Enter your **HCaptcha Secret Key**
- [ ] Save changes

### 2.3 Add Allowed Domains in HCaptcha

- [ ] In HCaptcha dashboard, add your domains:
  - `localhost` (for development)
  - `vinho.dev` (production)
  - Any staging domains

---

## 3. Supabase Auth Settings

### 3.1 Email Auth Settings

- [ ] Go to Supabase Dashboard > Authentication > Providers
- [ ] Ensure **Email** provider is enabled
- [ ] Configure settings:
  - [ ] Enable "Confirm email" (recommended)
  - [ ] Enable "Secure email change"
  - [ ] Set minimum password length to 8

### 3.2 Site URL

- [ ] Go to Supabase Dashboard > Authentication > URL Configuration
- [ ] Set **Site URL** to: `https://vinho.dev`

---

## 4. OAuth Providers

### 4.1 Apple Sign In

Minimal permissions: **name** and **email** (Apple may only return name on first consent).

#### Apple Developer Console

- [ ] Go to [Apple Developer Console](https://developer.apple.com/)
- [ ] Navigate to Identifiers > Service IDs

**Create Services ID (for web):**
- [ ] Create or select Service ID (e.g., `com.strategicnerds.vinho.web`)
- [ ] Enable "Sign in with Apple"
- [ ] Configure Website URLs:
  - **Domains**: `aghiopwrzzvamssgcwpv.supabase.co` (your Supabase project domain)
  - **Return URLs**: `https://aghiopwrzzvamssgcwpv.supabase.co/auth/v1/callback`

  Note: Apple only accepts HTTPS URLs. The OAuth flow goes through Supabase, which then redirects to your app's callback URLs configured in Supabase.

**Create Sign in with Apple Key:**
- [ ] Go to Keys > Create new key
- [ ] Enable "Sign in with Apple"
- [ ] Note the **Key ID**
- [ ] Note your **Team ID**
- [ ] Download the `.p8` file (keep secure)

**iOS App ID:**
- [ ] Ensure App ID has "Sign in with Apple" capability enabled

#### Supabase Configuration

- [ ] Go to Supabase Dashboard > Authentication > Providers > Apple
- [ ] Enable Apple provider
- [ ] Configure:
  - **Client IDs**: Comma-separated list of all App IDs and Service IDs:
    - `com.strategicnerds.vinho` (iOS App ID / Bundle ID)
    - `com.strategicnerds.vinho.web` (Service ID for web)
    - `host.exp.Exponent` (if testing with Expo Go)
  - **Secret Key (for OAuth)**: A JWT signed with your `.p8` key. Generate with:
    - Team ID: `955GSY56UT`
    - Key ID: `AY25H65TAY`
    - Service ID: `com.strategicnerds.vinho.web`
    - The secret expires every 6 months and must be regenerated
  - **Callback URL (for OAuth)**: Read-only. Copy this URL and add it to Apple's Service ID configuration

### 4.2 Google Sign In

Minimal permissions: **email** and **profile**.

#### Supabase Configuration (do this first)

- [ ] Go to Supabase Dashboard > Authentication > Providers > Google
- [ ] Enable Google provider
- [ ] Copy the **Callback URL (for OAuth)** shown (e.g., `https://aghiopwrzzvamssgcwpv.supabase.co/auth/v1/callback`)

#### Google Cloud Console

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Navigate to APIs & Services > OAuth consent screen
  - [ ] Configure consent screen (External or Internal)
  - [ ] Add scopes (search for "userinfo"):
    - `.../auth/userinfo.email` - See your primary Google Account email address
    - `.../auth/userinfo.profile` - See your personal info
  - [ ] Add test users if in testing mode
- [ ] Navigate to APIs & Services > Credentials

**Create OAuth Client ID:**
- [ ] Click "Create Credentials" > OAuth client ID
- [ ] Application type: Web application
- [ ] Set Authorized JavaScript origins:
  - `https://aghiopwrzzvamssgcwpv.supabase.co`
- [ ] Set Authorized redirect URIs:
  - Paste the Callback URL from Supabase (e.g., `https://aghiopwrzzvamssgcwpv.supabase.co/auth/v1/callback`)
- [ ] Note **Client ID** and **Client Secret**

#### Back to Supabase

- [ ] Enter Client ID and Client Secret from Google
- [ ] Save

---

## 5. Email Templates

### 5.1 Configure Confirmation Email

- [ ] Go to Supabase Dashboard > Authentication > Email Templates
- [ ] Edit "Confirm signup" template
- [ ] Customize with Vinho branding
- [ ] Ensure redirect URL: `{{ .SiteURL }}/auth/callback`

### 5.2 Configure Password Reset Email

- [ ] Edit "Reset Password" template
- [ ] Customize with Vinho branding
- [ ] Ensure redirect URL: `{{ .SiteURL }}/auth/update-password`

---

## 6. Web Configuration

### 6.1 Environment Variables

Create or update `.env.local` in `apps/vinho-web`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
VINHO_SERVICE_ROLE_KEY=<your-service-role-key>

# HCaptcha
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=<your-hcaptcha-site-key>
```

### 6.2 Production Environment Variables (Vercel)

- [ ] Go to Vercel Dashboard > Project > Settings > Environment Variables
- [ ] Add for all environments:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`
  - `VINHO_SERVICE_ROLE_KEY`

---

## 7. iOS Configuration

### 7.1 Info.plist Configuration

Add the following to Info.plist:

```xml
<!-- Face ID Usage Description (REQUIRED for biometric auth) -->
<key>NSFaceIDUsageDescription</key>
<string>Vinho uses Face ID to securely unlock your wine journal.</string>
```

### 7.2 URL Scheme for OAuth Callbacks

- [ ] In Xcode, go to Target > Info > URL Types
- [ ] Add URL Type:
  - **Identifier**: `dev.vinho.app`
  - **URL Schemes**: `vinho`
  - **Role**: Editor

This enables handling of `vinho://auth-callback` deep links.

### 7.3 Apple Sign In Capability

- [ ] In Xcode, go to Target > Signing & Capabilities
- [ ] Add "Sign in with Apple" capability

### 7.4 Associated Domains (Optional, for Universal Links)

- [ ] Add Associated Domains capability
- [ ] Add domain: `applinks:vinho.dev`

### 7.5 HCaptcha iOS Configuration

**Using Doppler/SecretsManager:**
- [ ] Add to your secrets configuration:
  ```
  HCAPTCHA_SITE_KEY=<your-hcaptcha-site-key>
  HCAPTCHA_DOMAIN=vinho.dev
  ```

### 7.6 Biometric Authentication

The BiometricAuthService is already implemented. To enable:

- [ ] Verify Info.plist has `NSFaceIDUsageDescription`
- [ ] Add Settings toggle in app UI bound to `BiometricAuthService.shared.biometricEnabled`
- [ ] App automatically locks on background when enabled

### 7.7 Doppler Secrets

Ensure Doppler includes:
- [ ] `VINHO_WEB_BASE_URL` (for account deletion API calls)
- [ ] Supabase credentials
- [ ] HCaptcha credentials

---

## 8. Verification Checklist

### Web Test Plan

- [ ] Visit `/auth/login` and `/auth/register`
- [ ] HCaptcha appears on both pages
- [ ] Password strength indicator shows on register page
- [ ] Email/password signup sends confirmation email
- [ ] Email/password login works after confirmation
- [ ] Forgot password flow works (`/auth/forgot-password`)
- [ ] Password update works (`/auth/update-password`)
- [ ] Apple Sign In redirects and authenticates
- [ ] Google Sign In redirects and authenticates
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Profile > Privacy & Security > Delete Account works

### iOS Test Plan

- [ ] HCaptcha loads in authentication views
- [ ] Email/password login works
- [ ] Email/password signup works with HCaptcha
- [ ] Password strength indicator shows during signup
- [ ] Apple Sign In: Native Apple sheet opens, completes, app returns authenticated
- [ ] Google Sign In: Safari sheet opens, completes, app returns authenticated
- [ ] Biometric can be enabled in settings
- [ ] App locks when going to background (if biometric enabled)
- [ ] Face ID/Touch ID unlocks the app
- [ ] Passcode fallback works

---

## Troubleshooting

### HCaptcha Issues

**Not loading:**
- Check site key is correct
- Verify domain is in HCaptcha allowed list
- Check browser console / Xcode logs for errors

### OAuth Issues

**Redirect errors:**
- Verify URLs in Supabase match exactly
- Check provider dashboard has correct callback URLs
- Ensure `vinho://auth-callback` is in Supabase redirect URLs

**iOS OAuth not returning to app:**
- Verify URL scheme `vinho` is registered
- Check redirect URL uses scheme: `vinho://auth-callback`

### Biometric Issues

**Not available:**
- Device may not support Face ID/Touch ID
- Check device settings

**Not locking on background:**
- Verify `biometricEnabled` is true
- Check scenePhase observer in VinhoApp.swift

### Email Issues

**Not receiving emails:**
- Check spam folder
- Verify Supabase email settings
- Check Supabase logs

---

## Permission Recap

We only request minimal permissions:
- **Apple**: `name`, `email` (name delivered once on first consent)
- **Google**: `email`, `profile`

No contacts, friends lists, ads permissions, or extended device permissions are requested.
