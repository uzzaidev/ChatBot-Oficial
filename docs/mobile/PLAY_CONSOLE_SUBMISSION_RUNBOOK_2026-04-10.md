# Play Console Submission Runbook - 2026-04-10

This is the exact sequence to publish the current Android build.

## 1) Upload build

1. Open Google Play Console.
2. Go to `UzzApp > Testing > Internal testing`.
3. Create a new release and upload:
   - `android/app/build/outputs/bundle/release/app-release.aab`
4. Save and roll out to internal testers.

## 2) Required app content checks

Complete/confirm:

- Privacy policy URL: `https://uzzapp.uzzai.com.br/privacy`
- Terms URL: `https://uzzapp.uzzai.com.br/terms`
- Data safety form
- App access (if login is required, provide test credentials)
- Content rating questionnaire
- Target audience

## 3) Store listing

Confirm:

- App name: `UzzApp`
- Short description: `Plataforma SaaS para gestao de atendimento via WhatsApp com IA`
- Full description: use current commercial/app copy
- Category: `Business`
- Contact email and website
- Screenshots:
  - Phone: at least 2
  - Recommended: 5-8 total

## 4) Technical sanity checks before production

- `versionCode` and `versionName` in `android/app/build.gradle`
- Push notifications permission present (`POST_NOTIFICATIONS`)
- Camera permission present (`CAMERA`)
- Biometric permission present (`USE_BIOMETRIC`)
- Login persistence validated on physical Android device
- Contacts and Inbox navigation validated on physical Android device

## 5) Promote to production

1. After internal test passes, create production release.
2. Reuse same AAB (if no code change) or build a newer one.
3. Submit for review.

## 6) If you need a new build quickly (Windows)

```powershell
.\scripts\android-preflight-check.ps1
.\scripts\build-android-release.ps1
```

