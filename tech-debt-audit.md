# Vinho technical debt audit

Priority uses `(impact + risk) x (6 - effort)`. Each input is scored from 1 to 5.

| Priority | Area | Finding | Impact | Risk | Effort | Score | State |
|---:|---|---|---:|---:|---:|---:|---|
| 0 | iOS security | Release archives bundled server credentials, including OpenAI, service-role, email, captcha, and App Store Connect values. | 5 | 5 | 1 | 50 | Fixed for next build; rotation open |
| 0 | Database security | Unused PostGIS and HTTP extensions exposed a table without RLS and outbound request RPCs to API roles. | 5 | 5 | 1 | 50 | Fixed live and tested |
| 1 | Dependencies | The JavaScript lockfile had 91 known advisories, including one critical issue and 50 high issues. | 5 | 5 | 1 | 50 | Fixed |
| 2 | Android release | Release builds used the debug signing key when production signing data was absent. | 5 | 5 | 1 | 50 | Fixed locally |
| 3 | iOS tests | The test source exists, but the Xcode project and shared scheme have no test target. | 5 | 5 | 2 | 40 | Fixed |
| 4 | Android tests | Android has two JVM behavior test files and one device test for the full app. | 5 | 5 | 2 | 40 | Open |
| 5 | Store release | Google Play signing, API access, screenshots, declarations, and release state are incomplete. | 5 | 5 | 2 | 40 | Open |
| 6 | Mobile parity | iOS and Android have no checked feature-parity contract or paired release gate. | 5 | 4 | 2 | 36 | Open |
| 7 | CI | Pull requests verify web and database code but do not compile either mobile app. | 4 | 5 | 2 | 36 | Open |
| 8 | Web correctness | New React checks found stale ref updates and callback ordering errors. | 4 | 4 | 2 | 32 | Fixed |
| 9 | Android quality | Android lint found one error and 81 warnings. Kotlin annotation processing also fell back to an older language level. | 4 | 4 | 2 | 32 | Fixed |
| 10 | Web quality | Web lint reports 39 warnings, including unnecessary effects and weak test types. | 4 | 3 | 2 | 28 | Fixed |
| 11 | Code size | The wine queue function is 1,572 lines. Several iOS views exceed 900 lines, and several mobile screens exceed 600 lines. | 4 | 4 | 3 | 24 | Open |
| 12 | iOS configuration | `project.yml` has stale version values and omits the test target, while the checked Xcode project has newer release values. | 3 | 4 | 2 | 28 | Fixed |
| 13 | Release docs | The iOS and Android submission guides describe old or incomplete release paths. | 3 | 3 | 2 | 24 | Open |
| 14 | Database source | Declarative schema files and migration history are both required, but CI does not run a schema drift check. | 4 | 4 | 3 | 24 | Open |
| 15 | iOS failures | Three startup and secret paths call `fatalError`, including nonce generation. | 3 | 4 | 3 | 21 | Fixed |
| 16 | Edge function logs | Apple account events include user identifiers and relay email data in logs. | 4 | 4 | 3 | 24 | Fixed |
| 17 | Edge functions | Deno type checking found 24 errors and lint found 62 issues, including a wrong Vector Buckets response field. | 4 | 4 | 2 | 32 | Fixed |

## Cleanup phases

1. Remove security, signing, compile, lint, and test failures.
2. Add mobile test targets and a paired parity check.
3. Split the largest files where behavior tests protect the change.
4. Add mobile and schema checks to CI.
5. replace old release documentation with tested commands.
6. Build, upload, and submit both store releases.

This file is updated as findings are fixed or verified.
