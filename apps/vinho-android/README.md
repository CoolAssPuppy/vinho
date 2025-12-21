# Vinho for Android

This module contains the native Android implementation of the Vinho wine journal. It mirrors the Supabase-powered feature set that ships on iOS: authentication, tasting journal, wine scanning, map insights, and profile management.

## Stack

- **Kotlin + Jetpack Compose** for UI
- **Hilt** for dependency injection
- **Navigation-less root** (conditional UI) to keep startup snappy
- **DataStore** for local preferences
- **Supabase Kotlin client** (`postgrest`, `storage`, `functions`, `gotrue`) for all backend access
- **Android Photo Picker** for uploading scans to the queue processed by the `process-wine-queue` edge function
- **PostHog** for analytics that mirror the iOS telemetry

## Project structure

```
apps/vinho-android/
├── app/
│   ├── build.gradle.kts
│   └── src/main/java/com/vinho/android/
│       ├── core/           # Configuration, DI, analytics, biometrics, preferences
│       ├── data/           # Models and Supabase repositories
│       ├── ui/             # Compose screens and view models
│       └── VinhoActivity.kt, VinhoApp.kt, VinhoTheme.kt
```

## Configuration

Create a `local.properties` file in `apps/vinho-android/` (sibling to `settings.gradle.kts`) with your environment secrets:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
VINHO_API_BASE_URL=https://vinho.dev
MAPS_API_KEY=optional-google-maps-key
POSTHOG_API_KEY=phc_xxx
POSTHOG_HOST=https://app.posthog.com
```

All values default to empty strings except `VINHO_API_BASE_URL` (defaults to `https://vinho.dev`) and `POSTHOG_HOST` (defaults to `https://app.posthog.com`).

## Running

From the repo root:

```bash
cd apps/vinho-android
./gradlew :app:assembleDebug
```

If you add a Maps API key, also configure it in your emulator or device as usual. The build uses Java 21 and Gradle 8.14+ via the included wrapper.

## Tests

Lightweight instrumentation tests live in `app/src/androidTest/java`. Run them with:

```bash
./gradlew :app:connectedAndroidTest
```
