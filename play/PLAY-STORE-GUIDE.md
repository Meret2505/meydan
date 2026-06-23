# Publishing MEÝDAN to Google Play

This app ships as a **TWA (Trusted Web Activity)** — a thin Android shell that
loads `https://meydan-chi.vercel.app` full-screen. Content updates ship by
deploying the website; you only re-upload the Android package when you change
the native shell (icon, name, target SDK, etc.).

---

## 0. One-time toolchain (already set up on this machine)

- JDK 17: `/opt/homebrew/opt/openjdk@17` (Homebrew formula)
- Android SDK: `~/Library/Android/sdk` (+ `cmdline-tools/latest`, `build-tools;34.0.0`, `platforms;android-36`)
- Bubblewrap CLI: `npm i -g @bubblewrap/cli`
- Bubblewrap config: `~/.bubblewrap/config.json` (points at the JDK + SDK above)

## Rebuilding the AAB later

```bash
cd android
export BUBBLEWRAP_KEYSTORE_PASSWORD="<from KEYSTORE-CREDENTIALS.txt>"
export BUBBLEWRAP_KEY_PASSWORD="<same>"
# bump versions before each Play upload:
#   edit twa-manifest.json -> appVersionCode (must increase) + appVersionName
bubblewrap build --skipPwaValidation
# outputs: app-release-bundle.aab (upload this) + app-release-signed.apk (sideload to test)
```

---

## 1. Create a Google Play Developer account  ← only you can do this

- Go to https://play.google.com/console → **Create account** (Personal or Organization).
- Pay the **one-time $25** registration fee.
- Complete **identity + (for orgs) D-U-N-S verification**. This can take 1–2 days.
- New personal accounts created after Nov 2023 must also complete **closed testing
  with 12+ testers for 14 days** before they can publish to production. Plan for this:
  start an Internal/Closed testing track immediately after upload.

## 2. Create the app

Play Console → **Create app**:

| Field | Value |
|-------|-------|
| App name | `MEÝDAN` |
| Default language | Russian (ru-RU) |
| App or game | App |
| Free or paid | Free |
| Declarations | Accept Developer Program Policies + US export laws |

## 3. Upload the AAB

- **Release → Testing → Internal testing → Create new release.**
- Upload `android/app-release-bundle.aab`.
- **Play App Signing is enabled by default** — accept it. Google holds the real
  *app signing key*; the keystore in this repo is your *upload key*.

### 3a. CRITICAL — add the Play app-signing fingerprint to assetlinks.json

After the first upload, open **Release → Setup → App integrity → App signing**.
Copy the **SHA-256 certificate fingerprint** shown there and add it as a SECOND
entry in `public/.well-known/assetlinks.json`, alongside the upload-key one that's
already there:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.meydan.app",
    "sha256_cert_fingerprints": [
      "12:F7:EA:...:F7:8B",          // upload key (already present)
      "<PLAY APP-SIGNING SHA-256>"   // <-- paste from Play Console
    ]
  }
}]
```

Then `git commit && git push` (Vercel redeploys). Without this, the app installed
**from the Play Store** will show a URL bar instead of running full-screen, because
its signature won't match the Digital Asset Links.

## 4. Complete the store listing (Grow → Store presence → Main store listing)

| Asset | Requirement | Provided |
|-------|-------------|----------|
| App icon | 512×512 PNG, 32-bit | `public/icons/play-store-512.png` |
| Feature graphic | 1024×500 PNG/JPG, no alpha | `android/play-feature-graphic-1024x500.png` |
| Phone screenshots | 2–8, PNG/JPG, 16:9 or 9:16, min 320px | capture from the running app (login, feed, game detail, fields) |
| Short description | ≤ 80 chars | see `store-listing.md` |
| Full description | ≤ 4000 chars | see `store-listing.md` |

## 5. Required compliance forms

- **Content rating** questionnaire (Policy → App content). Social/sports app, no
  objectionable content → likely PEGI 3 / Everyone.
- **Data safety** form: declare what you collect — name, phone, email (Google
  sign-in), profile photo, approximate location (district selection). All used for
  app functionality; not sold. Account deletion: provide a contact/URL.
- **Privacy policy URL** — **mandatory**. You need a hosted privacy policy page.
  (Ask me to add a `/privacy` route to the app and I'll publish one at
  `https://meydan-chi.vercel.app/ru/privacy`.)
- **Target audience**: 18+ (or 13+) — not directed at children, to avoid the
  Families policy overhead.
- **Ads**: declare "No ads" (unless you add them).

## 6. Roll out

- Add testers (emails) to the Internal testing track → share the opt-in link →
  install from Play to verify full-screen (no URL bar) + Google sign-in work.
- When satisfied (and after the 14-day closed-test requirement if it applies),
  promote the release to **Production**.

---

## Files in this folder

| File | Purpose | Committed? |
|------|---------|-----------|
| `twa-manifest.json` | Bubblewrap TWA config (source of truth) | ✅ yes |
| `android.keystore` | Upload signing key | ❌ NEVER (gitignored) |
| `KEYSTORE-CREDENTIALS.txt` | Keystore passwords | ❌ NEVER (gitignored) — **back up offline** |
| `app-release-bundle.aab` | Upload to Play | ❌ no (rebuildable) |
| `app-release-signed.apk` | Sideload to test on a device | ❌ no (rebuildable) |
| `play-feature-graphic-1024x500.png` | Store listing | ✅ yes |
| gradle project files | Generated by `bubblewrap update` | ✅ yes (reproducible build) |
