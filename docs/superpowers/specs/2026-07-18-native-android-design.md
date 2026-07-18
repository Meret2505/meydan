# Native Android Client — Design

**Date:** 2026-07-18
**Status:** Approved for planning
**Scope:** Replace the Capacitor WebView shell with a native Kotlin/Compose Android app, backed by a new JSON API on the existing Next.js deployment.

---

## 1. Motivation

The Android app today is a Capacitor shell that loads `https://meydan-chi.vercel.app` in a WebView (`capacitor.config.ts`). It has no local assets, so it is unusable without network, cannot feel native, and cannot reach native capabilities.

Three drivers, in priority order:

1. **Performance and feel** — scrolling, transitions, and cold start should be native.
2. **Native capabilities** — real Google Sign-In, maps, background work, notifications.
3. **Offline** — the app must be useful on poor connectivity.

Non-drivers: there is no Play Store policy problem to solve.

## 2. Constraints

- **The Next.js web app keeps working unchanged.** No web screen is modified. No web behavior changes.
- **`com.meydan.app` and `keys/android.keystore` are reused.** Google Sign-In is already registered against this package + certificate and works in production, including in Turkmenistan. Reusing both means zero Google Cloud Console changes.
- **minSdk 24, targetSdk 36** — matches the current shell, so no existing user loses access.
- **Locales `ru` (default) and `tm`** must both ship.
- The Capacitor `android/` project and `MEYDAN.apk` keep shipping until the native app reaches parity.

## 3. Architecture

Two halves. The API lands first; the Android client is inert without it.

```
┌─────────────────┐         ┌──────────────────────────┐
│  Next.js web    │────────▶│  lib/services/*.ts       │  NEW: business logic,
│  (UI unchanged) │         │  joinGame, leaveGame, …  │  extracted once
└─────────────────┘         └──────────────────────────┘
                                      ▲          ▲
┌─────────────────┐         ┌─────────┘          │
│ app/actions/*   │─────────┘                    │
│ (thin wrappers) │            ┌─────────────────┴────┐
└─────────────────┘            │  /api/v1/* routes    │  NEW: JSON API
                               └──────────────────────┘
                                         ▲ HTTPS + Bearer
                               ┌─────────┴────────────┐
                               │  Android (Compose)   │  NEW
                               └──────────────────────┘
```

No new infrastructure. The API is additive Route Handlers on the existing Vercel deployment, using the same Prisma client and Postgres.

### 3.1 Service layer extraction

Business logic currently lives in Server Actions (`app/actions/games.ts`). `joinGame` in particular carries logic that must not be reimplemented incorrectly: a transaction that re-reads participant count, rejects non-`OPEN`/`FULL` games, flips status to `FULL` on the last spot, writes a `Notification` row, and fires FCM to the organizer in their locale.

Each such function moves to `lib/services/<domain>.ts` as a pure async function taking explicit arguments (`userId`, ids, values) and returning a discriminated result. The Server Action becomes a wrapper that resolves the session, calls the service, and does its Next-specific `revalidatePath` / `redirect`. The API route calls the same service and serialises the result.

This is the only change to existing web code, and it is behaviour-preserving by construction: the action keeps its signature and its cache/redirect calls.

## 4. Authentication

Native clients cannot use NextAuth's cookie session. The API gets its own token endpoints, which reuse the existing credential-verification logic rather than duplicating it.

| Endpoint | Body | Reuses |
|---|---|---|
| `POST /api/v1/auth/phone` | `{ phone, password }` | `phoneLoginOrSignup`, `app/actions/auth.ts` |
| `POST /api/v1/auth/google` | `{ idToken }` | `googleVerifier`, `lib/auth.ts:92` |
| `POST /api/v1/auth/refresh` | `{ refreshToken }` | — |
| `POST /api/v1/auth/logout` | `{ refreshToken }` | — |

### 4.0 Phone auth is login-**or**-signup

`POST /api/v1/auth/phone` is not a login endpoint. The existing `phoneLoginOrSignup` action creates the account when the phone is unknown, and this behaviour must be preserved exactly. It carries several protections that a reimplementation would very likely lose:

- `normalizePhone` before any lookup.
- Two rate limits, not one: 10 attempts per IP per 10 minutes **and** 5 per phone per 15 minutes, the second tighter because a targeted attack fixes the phone.
- A timing-uniform bcrypt compare against a precomputed `DUMMY_HASH` on the account-not-found path, so response latency cannot distinguish "no such phone" from "wrong password".
- An 8-character minimum enforced **only on new signups**; existing accounts predate that floor and must still be able to log in with shorter passwords.
- Prisma `P2002` handling for the unique-phone race between the existence check and the insert, reported as a normal failed login.

The response must include `isNewSignup` so the client routes to onboarding rather than the feed — this is what the web action's final `redirect` encodes.

This function is the strongest argument for the service-layer extraction in §3.1. Reimplementing it in a second place is how the timing-attack defence and the legacy-password carve-out quietly get dropped.

**Access token.** HS256 JWT, 15 minute TTL, signed with the existing `AUTH_SECRET`. Claims: `sub` (user id), `onboardingComplete`, `exp`.

**Refresh token.** Opaque 256-bit random value. Stored **SHA-256 hashed** in a new `RefreshToken` table — a database leak must not yield usable tokens. Rotated on every use. If an already-rotated token is presented, the entire token family for that device is revoked (reuse implies theft).

**Client handling.** An OkHttp `Authenticator` refreshes on `401` behind a single-flight mutex, so N concurrent 401s produce one refresh rather than N. On refresh failure the user is returned to login and the token store is cleared.

**Client storage.** DataStore, with the refresh token encrypted under an Android Keystore AES-GCM key.

Auth endpoints are rate-limited through the existing `lib/rate-limit.ts` and `RateLimit` model.

### 4.1 Google Sign-In

Uses **Credential Manager** (`androidx.credentials` + `com.google.android.libraries.identity.googleid`), not the deprecated `GoogleSignInClient`. Configured with `serverClientId = GOOGLE_CLIENT_ID`, so the resulting ID token's audience is the web client id — exactly what `lib/auth.ts:79`'s `google-id-token` provider already verifies. **No backend change is needed for Google login.**

This removes an existing workaround: the web login hides its Google button when the user agent contains `MeydanAndroid`, because Google blocks OAuth inside embedded WebViews (`capacitor.config.ts`). Credential Manager is not a WebView, so Google Sign-In becomes a first-class button on native.

### 4.2 Signing

Both `debug` and `release` build types sign with `keys/android.keystore`, so debug builds present the same certificate fingerprint that Google Cloud Console already trusts. Consequence: the Capacitor APK and the native APK share an application id and cannot be installed side by side on one device.

## 5. API surface — slice 1

Response envelope follows the project's existing `ApiResponse<T>` convention:

```ts
{ success: boolean, data?: T, error?: string, meta?: { total, page, limit } }
```

```
GET    /api/v1/games?tab=open|mine&chip=today|five|goalie
GET    /api/v1/games/:id
POST   /api/v1/games/:id/join
DELETE /api/v1/games/:id/join
GET    /api/v1/me
PATCH  /api/v1/me                    # onboarding writes
POST   /api/v1/me/fcm-token
GET    /api/v1/notifications/unread-count
```

Every request body and query object gets a Zod schema. DTOs are hand-mirrored in Kotlin — eight endpoints does not justify OpenAPI codegen; revisit at roughly 25.

**Districts need no endpoint.** `DISTRICTS` is a static constant in `lib/data.ts`, consumed by the onboarding district step. It is mirrored as a Kotlin constant rather than fetched. This is deliberate, not a shortcut: a user onboarding on poor connectivity must be able to pick a district, and a network-fetched list would block that. The list changes rarely; if it ever does, both copies change together.

Authorization is enforced per-route in the service layer, not the handler, so the web path is covered by the same checks.

## 6. Android client

### 6.1 Module structure

```
android-native/
  app/                    # single Activity, NavHost, Hilt entry point
  core/
    designsystem/         # Material 3 theme, tokens, shared composables
    network/              # Retrofit, DTOs, auth interceptor + authenticator
    database/             # Room entities, DAOs
    datastore/            # token store, preferences
    common/               # Result type, dispatchers
  feature/
    auth/                 # login, onboarding (5 steps)
    games/                # feed, detail
    profile/
```

Gradle version catalogs plus convention plugins, so module count does not become build-script duplication.

### 6.2 Patterns

- **Stack:** Kotlin, Compose, single Activity, Navigation Compose (type-safe routes), Hilt, Retrofit + kotlinx.serialization, Room, Coil, DataStore, WorkManager.
- **Per screen:** a `ViewModel` exposing `StateFlow<UiState>`, where `UiState` is a sealed interface. Repositories expose `Flow<Result<T>>`.
- **Cache-then-network:** repositories emit cached Room data immediately, then refresh from network and emit again. The UI never shows a blocking spinner when it already has data.

### 6.3 Design system

Ported from `app/globals.css`, which defines **both** a dark and a light palette (the app has a `ThemeToggle`). Both must ship as `darkColorScheme` / `lightColorScheme`.

| Token | Dark | Light |
|---|---|---|
| `bg` | `#0B0E0D` | `#F5F7F5` |
| `surface` | `#13181A` | `#FFFFFF` |
| `surface-2` | `#1B2123` | `#EDF1EE` |
| `primary` | `#1FD16B` | `#14A85A` |
| `primary-text` | `#06210F` | `#FFFFFF` |
| `primary-soft` | `#5BE39A` | `#0D8A47` |
| `warning` | `#F2B53C` | `#C48A15` |
| `danger` | `#E0556A` | `#C13548` |
| `text` | `#F2F5F3` | `#0B1410` |
| `text-soft` | `#C7CEC9` | `#2E3A34` |
| `text-muted` | `#8A938E` | `#626E67` |
| `text-faint` | `#5F665F` | `#97A19A` |
| `border` | `rgba(255,255,255,.08)` | `rgba(11,20,16,.10)` |
| `border-strong` | `rgba(255,255,255,.12)` | `rgba(11,20,16,.16)` |

Radii: 8 / 12 / 16 / full. Fonts: **Archivo** (display) and **Manrope** (sans), bundled as font resources.

Theme selection follows the system by default with an in-app override persisted to DataStore, matching current web behaviour.

### 6.4 Localization

- `values/` holds Russian (the app's default locale).
- `values-tk/` holds Turkmen. `tk` is the ISO 639-1 *language* code; the app's existing `tm` is the *country* code for Turkmenistan and is not a valid Android resource qualifier.
- The API continues to speak `tm`. The client maps `tm ↔ tk` in exactly one place (`core/common`), so the wire format is never in doubt.
- The in-app language toggle drives `AppCompatDelegate.setApplicationLocales()` with an `android:localeConfig` manifest entry — per-app language on Android 13+, backported via appcompat below that.
- Strings are ported from `messages/ru.json` and `messages/tm.json` to `strings.xml`.

## 7. Offline

Room caches the games feed, game details, and profile. Opening the app offline shows the last-known feed with a staleness indicator.

**Writes require network.** `join` and `leave` check connectivity up front and fail with a clear message. This is deliberate: the server owns spot capacity, so an offline join cannot promise a spot. Queuing it would mean telling the user they joined and then silently failing on sync when the game filled. An honest error is better UX than an optimistic lie.

Cache is invalidated on successful write and on FCM data messages.

## 8. Slice 1 — scope

Nine screens, chosen to exercise every layer of the stack end to end:

1. Login (phone + Google)
2. Onboarding — name, phone, age, district, position (5 screens)
3. Games feed — `open`/`mine` tabs, `today`/`five`/`goalie` chips
4. Game detail — participants, join/leave
5. Profile (view only)

**Explicitly excluded from slice 1:** fields and map, players, teams, tournaments, notifications list, game creation, result entry, avatar upload, profile editing.

Completion criterion: an installable APK where a new user can sign in, onboard, browse games offline, and join a game — with push arriving to the organizer.

## 9. Testing

- **Service layer:** unit tests against a test Postgres. Two critical cases:
  - `joinGame` concurrency — two users racing for the final spot must produce exactly one join and one `FULL` transition.
  - `phoneLoginOrSignup` — new-signup creation, legacy short-password login, the 8-char floor applying to signups only, both rate limits, and the `P2002` race path. Timing uniformity is asserted structurally (a bcrypt compare always runs) rather than by wall-clock measurement, which is too flaky for CI.
- **API routes:** request/response tests including authorization (user B must not be able to leave user A's game).
- **Android:** Turbine for ViewModel state, MockWebServer for the API client including the 401-refresh single-flight path, in-memory Room for DAOs, Compose UI tests for login and join/leave.
- Target 80% coverage on the service layer and ViewModels.

## 10. Risks and deferred decisions

| # | Item | Resolution |
|---|---|---|
| 1 | Google Sign-In config | **Resolved.** Reusing `com.meydan.app` + existing keystore means no console changes. |
| 2 | Play Services availability | **Resolved.** Confirmed working in market; Google Sign-In is first-class. |
| 3 | Locale code mismatch | **Resolved.** `values-tk/` on the client, `tm` on the wire, mapped in one place. |
| 4 | Maps library | **Resolved.** Google Maps Compose. Needed in slice 2, not slice 1. Requires a Maps API key with billing enabled. |
| 5 | Logic duplication | **Resolved.** Service-layer extraction; single source of truth. |
| 6 | Offline write semantics | **Resolved.** Reads cached, writes require network. |
| 7 | Side-by-side install | **Accepted.** Shared application id means the Capacitor and native APKs cannot coexist on one device. |
| 8 | Maps API key + billing | **Open.** Must be provisioned before slice 2. |

## 11. Out of scope

- Any change to web UI, web routing, or web authentication.
- iOS.
- Migrating existing web sessions to the new token scheme; the two auth paths coexist independently.
- Slice 2+ features, which get their own specs.
