# App Store Submission Process for Vinho

## Phase 1: Apple Developer Setup (One-time, Manual)

**Time Required: 30-60 minutes**

### 1.1 Developer Account

- [ ] Purchase Apple Developer membership ($99/year) at [developer.apple.com](https://developer.apple.com)
- [ ] Wait for activation (instant to 48 hours)
- [ ] Accept all agreements in App Store Connect

### 1.2 Register App

- [ ] Log into [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Click "+" → New App → iOS
- [ ] Enter:
  - **Platform**: iOS
  - **App Name**: Vinho (or your preferred name)
  - **Primary Language**: English (U.S.)
  - **Bundle ID**: Create new → `com.yourcompany.vinho`
  - **SKU**: `vinho-001` (any unique identifier)
  - **User Access**: Full Access

### 1.3 Tax & Banking (Required for any app)

- [ ] Agreements, Tax, and Banking → Complete all sections
- [ ] Even free apps need tax forms completed

## Phase 2: App Store Connect Initial Setup (Manual)

**Time Required: 45-90 minutes**

### 2.1 App Information Tab

- [ ] **Category**: Primary: Food & Drink, Secondary: Lifestyle
- [ ] **Content Rights**: Check "No third-party content"
- [ ] **Age Rating**: Click "Edit" → Answer questionnaire
  - Alcohol Reference: Yes, Infrequent/Mild
  - All others: No
  - Result: Should be 17+

### 2.2 Pricing and Availability

- [ ] **Price**: Free
- [ ] **Availability**: All countries (or select specific ones)

### 2.3 App Privacy (REQUIRED - Blocks submission if incomplete)

- [ ] Click "Get Started" on App Privacy
- [ ] Privacy Policy URL: Add your URL (required)
- [ ] Data Collection practices:
  - [ ] Email Address: Yes → Sign-In → Linked to user
  - [ ] Name: Yes (if collecting) → Sign-In → Linked to user
  - [ ] Photos: Yes (if wine label scanning) → App Functionality → Linked to user
  - [ ] Location: Yes (if tracking tasting locations) → App Functionality → Linked to user
  - [ ] User Content (wine notes): Yes → App Functionality → Linked to user
- [ ] Publish privacy details

### 2.4 Prepare Version 1.0

- [ ] Click on "1.0 Prepare for Submission"
- [ ] **Version Information**:
  - **What's New**: "Initial release of Vinho - Your personal wine journey tracker"
- [ ] **Promotional Text** (170 chars):
  ```
  Track, rate, and discover wines with Vinho. Build your wine knowledge, remember every bottle, and explore your taste preferences on your wine journey.
  ```
- [ ] **Description** (paste from provided App Store copy)
- [ ] **Keywords** (100 chars max):
  ```
  wine,tracker,journal,rating,notes,tasting,cellar,review,sommelier,vivino
  ```
- [ ] **Support URL**: Your website or GitHub repo
- [ ] **Marketing URL**: Optional (your landing page)

### 2.5 General App Information

- [ ] **App Icon**: 1024x1024px (no transparency, no rounded corners)
  - Will be automatically generated from Xcode assets
- [ ] **Copyright**: © 2025 Your Company Name
- [ ] **Trade Representative Contact**: Your country info (if outside US)
- [ ] **App Review Contact**: Your email and phone

### 2.6 Review Information

- [ ] **Sign-in Required**: Yes
- [ ] **Demo Account**:
  - Username: `appstore@review.com`
  - Password: `TestPassword123!`
- [ ] **Notes**:
  ```
  This is a wine tracking app. The demo account has sample wine tastings already added.
  To test: Login → View Journal → Add new tasting → View Map → Check Statistics
  ```

## Phase 3: Xcode Project Configuration (Manual)

**Time Required: 20-30 minutes**

### 3.1 Project Settings

- [ ] Select Vinho project → Vinho target
- [ ] **Bundle Identifier**: Match App Store Connect exactly
- [ ] **Version**: 1.0.0
- [ ] **Build**: 1
- [ ] **Deployment Target**: iOS 17.0
- [ ] **Device**: iPhone only (unless supporting iPad)

### 3.2 Capabilities

- [ ] Verify all capabilities match your provisioning profile:
  - Push Notifications (if used)
  - Sign in with Apple (if used)
  - Background Modes (if needed)

### 3.3 Info.plist Requirements

- [ ] **Privacy Descriptions** (all that apply):
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>Vinho uses the camera to scan wine labels</string>
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>Vinho records where you enjoyed each wine</string>
  <key>NSPhotoLibraryUsageDescription</key>
  <string>Vinho needs access to save and upload wine photos</string>
  ```
- [ ] **App Transport Security**: Already configured
- [ ] **Supported Interface Orientations**: Portrait only

### 3.4 App Icons

- [ ] Ensure all icon sizes are provided in Assets.xcassets
- [ ] Run app on simulator to verify icons appear correctly

## Phase 4: Fastlane Automation Setup (One-time)

**Time Required: 60-90 minutes**

### 4.1 Install Fastlane

```bash
cd /Users/prashant/Developer/vinho/apps/vinho-ios
sudo gem install fastlane
fastlane init
# Choose: 2. Automate beta distribution to TestFlight
```

### 4.2 App Store Connect API Key

- [ ] App Store Connect → Users and Access → Keys → Generate API Key
- [ ] **Name**: "Fastlane CI"
- [ ] **Access**: App Manager
- [ ] Download .p8 file (SAVE IT - only downloadable once!)
- [ ] Note the Key ID and Issuer ID

### 4.3 Match Setup (Certificate Management)

- [ ] Create private GitHub repo: `github.com/yourcompany/ios-certificates`
- [ ] Generate Personal Access Token on GitHub (Settings → Developer → PAT)
- [ ] Run:
  ```bash
  fastlane match init
  # Enter the certificates repo URL
  fastlane match appstore --readonly false
  # This creates/downloads certificates
  ```

### 4.4 Screenshot Automation (Fastlane will handle)

- [ ] Fastlane automatically captures screenshots using UI tests
- [ ] No manual screenshots needed if you set up snapshot

### 4.5 Create Fastfile

```bash
fastlane init
```

Fastlane creates the configuration - we'll customize it later

## Phase 5: GitHub Actions Setup

**Time Required: 30 minutes**

### 5.1 Create GitHub Secrets

Go to repo Settings → Secrets → Actions → New repository secret:

- [ ] `APP_STORE_CONNECT_API_KEY_ID`: Your key ID from step 4.2
- [ ] `APP_STORE_CONNECT_API_ISSUER_ID`: Your issuer ID
- [ ] `APP_STORE_CONNECT_API_KEY`:
  ```bash
  base64 -i /path/to/AuthKey_XXXXXX.p8 | pbcopy
  # Paste this value
  ```
- [ ] `MATCH_PASSWORD`: Password for match encryption
- [ ] `MATCH_GIT_BASIC_AUTHORIZATION`:
  ```bash
  echo -n "github_username:github_pat_token" | base64 | pbcopy
  # Paste this value
  ```

### 5.2 Workflow File

We'll create `.github/workflows/ios-release.yml` to automate deployment

## Phase 6: First Deployment Process

**Time Required: 2-3 hours first time, 15 minutes subsequent**

### 6.1 Pre-flight Checklist

- [ ] Increment build number in Xcode
- [ ] Test on physical device
- [ ] Run all unit tests
- [ ] Verify no crashes in 5-minute usage

### 6.2 Manual First Submission (Recommended)

First time only - do manually to understand the process:

1. Xcode → Product → Archive
2. Distribute App → App Store Connect → Upload
3. Wait for processing (5-10 minutes)
4. App Store Connect → TestFlight → Manage Missing Compliance
   - [ ] Export Compliance: "No" (unless using custom encryption)
5. TestFlight → Add External Testers (optional)

### 6.3 Submit for Review

- [ ] App Store Connect → App Store → Submit for Review
- [ ] Automatically release: Yes (or manual)
- [ ] Submit

## Phase 7: Ongoing Automation

**After initial setup, each release only requires:**

1. **Update version/build** in Xcode
2. **Push to main branch**
3. **GitHub Actions automatically**:
   - Builds app
   - Signs with certificates
   - Uploads to TestFlight
   - Submits for review (if configured)

## Common Rejection Reasons to Avoid

### Design Issues

- [ ] Placeholder content (Lorem ipsum)
- [ ] Broken links
- [ ] Crashes or bugs
- [ ] Web view of website (must be native)

### Metadata Issues

- [ ] Screenshots don't match app
- [ ] Mentions other platforms (Android)
- [ ] Incorrect age rating
- [ ] Missing privacy policy

### Functionality Issues

- [ ] Login required but no demo account
- [ ] Features that don't work
- [ ] No way to restore purchases (if IAP)

## Timeline

| Task                  | First Time    | Automated     |
| --------------------- | ------------- | ------------- |
| Apple Setup           | 2-3 hours     | N/A           |
| Fastlane Setup        | 1-2 hours     | N/A           |
| Build & Upload        | 30 minutes    | 5 minutes     |
| TestFlight Processing | 10-30 minutes | 10-30 minutes |
| Review Submission     | 10 minutes    | Automatic     |
| App Review Time       | 24-48 hours   | 24-48 hours   |

## Emergency Contacts

- **App Review Board**: Expedited review request in App Store Connect
- **Developer Support**: [developer.apple.com/support](https://developer.apple.com/support)
- **Resolution Center**: In App Store Connect for review issues

## Next Steps

1. Complete Phases 1-3 manually
2. Run `fastlane init` in your iOS directory
3. We'll create custom Fastfile and GitHub Actions workflow
4. Test with TestFlight first
5. Submit to App Store

---

**Ready to start?** Begin with Phase 1 and work through sequentially. Most time is spent waiting for Apple reviews, not actual work.
