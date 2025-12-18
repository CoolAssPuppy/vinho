# Login & Social Auth Setup

Use this checklist to provision Apple, Google, and Facebook sign-in for both iOS and web. Follow the order below so every redirect and permission is in place before testing.

## 0. Prerequisites
1. Confirm environment variables are present (via Doppler or `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `VINHO_SERVICE_ROLE_KEY` (needed for account deletion API)
   - `VINHO_WEB_BASE_URL` (iOS uses this to call `/api/account/delete`; set to `https://vinho.dev` for production)
2. Keep the existing custom URL scheme `vinho` in Xcode (Info.plist) so `vinho://auth-callback` works.
3. Add these **Redirect URLs** to Supabase Auth → Settings → Redirect URLs (one per line):
   - `https://vinho.dev/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `vinho://auth-callback`
4. In Supabase Auth → Providers, enable Apple, Google, and Facebook (steps below) and save after each provider is configured.

## 1. Apple (Sign in with Apple)
Minimal permissions: **name** and **email** (requested once; Apple may only return the name on first consent).

Steps:
1. In the Apple Developer portal → Identifiers → **Service IDs**, create (or select) a Service ID for web sign-in (e.g., `com.strategicnerds.vinho.web`).
2. Edit the Service ID → Enable **Sign in with Apple** → Configure.
3. Add the following return URLs:
   - `https://vinho.dev/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `vinho://auth-callback`
4. Under **Domains and Subdomains**, add your production domain (`vinho.dev`).
5. Create (or reuse) a Sign in with Apple key (Keys → **+**):
   - Enable Sign in with Apple
   - Note the **Key ID**, **Team ID**, and download the `.p8` key file.
6. In Supabase Auth → Providers → Apple, fill:
   - **Client ID**: the Service ID from step 1
   - **Team ID**: from step 5
   - **Key ID**: from step 5
   - **Private Key**: contents of the `.p8` file
   - Scopes: `name email`
7. In Xcode (Signing & Capabilities), add **Sign in with Apple** capability to the app target.
8. Clean/rebuild and test on device/simulator: start login, choose Apple, complete Safari sheet, and verify the app returns to the authenticated state.

## 2. Google
Minimal permissions: **email** and **profile**.

Steps:
1. In Google Cloud Console → Credentials → **Create Credentials → OAuth client ID** (Web application).
2. Set Authorized redirect URIs:
   - `https://vinho.dev/auth/callback`
   - `http://localhost:3000/auth/callback`
3. Add Authorized JavaScript origins if prompted:
   - `https://vinho.dev`
   - `http://localhost:3000`
4. Copy the **Client ID** and **Client Secret**.
5. In Supabase Auth → Providers → Google, paste Client ID/Secret and set scopes to `email profile`.
6. Save and test: from the web login screen, click Google → ensure redirect to `/auth/callback` and that the session is created.

## 3. Facebook
Minimal permissions: **public_profile** and **email**.

Steps:
1. In Meta for Developers → Create App (or open existing) → Facebook Login → Settings.
2. Add Valid OAuth Redirect URIs:
   - `https://vinho.dev/auth/callback`
   - `http://localhost:3000/auth/callback`
3. In App Domains, add `vinho.dev`.
4. Copy the **App ID** and **App Secret**.
5. In Supabase Auth → Providers → Facebook, paste App ID/Secret and set scopes to `public_profile email`.
6. Put the app in Live mode (or add your testers) so non-developer accounts can sign in.
7. Test via the web login screen and confirm redirect to `/auth/callback` succeeds.

## 4. iOS-specific checks
1. Ensure `vinho://auth-callback` is listed in Supabase redirect URLs (step 0) and matches the app URL scheme (`vinho`).
2. Confirm Doppler secrets include `VINHO_WEB_BASE_URL` so the app can call `/api/account/delete`.
3. After configuring providers in Supabase, run the iOS app:
   - Tap Apple/Google/Facebook → Safari sheet appears.
   - Complete auth → app returns signed-in (Auth manager listens for `vinho://auth-callback`).
4. If testing locally with a tunnel (e.g., `ngrok`), add that HTTPS URL to Supabase redirect URLs temporarily.

## 5. Web test plan
1. Visit `/auth/login` and `/auth/register` in production and localhost.
2. Email/password flow: create an account, receive verification, and sign in.
3. Social flows: Apple, Google, and Facebook each redirect to `/auth/callback` and land on `/journal`.
4. Profile → Privacy & Security → **Delete Account**: confirm deletion works (requires `VINHO_SERVICE_ROLE_KEY`).

## 6. Permission recap
- Apple: `name`, `email` (one-time name delivery from Apple).
- Google: `email`, `profile`.
- Facebook: `public_profile`, `email`.
