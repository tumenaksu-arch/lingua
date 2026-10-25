# Love-Vox mobile shell (Android)

(Display name Love-Vox; the repo, package id `com.tumenaksu.lingua` keep the original name; the web app moved from /lingua/ to /lovevox/, the server redirects the old path.)

A Capacitor 7 "web shell", same pattern as the EduPilot app: the APK contains no app code,
it opens **https://ankaxai.ai/lovevox/** in a WebView. Every web deploy reaches the phone on
the next launch; a new APK is needed only when this folder changes (plugins, icons, Android code).

- `capacitor.config.json` — `server.url`, package `com.tumenaksu.lingua`; `www/index.html` is the offline page.
- Native plugins the web build uses inside the shell (`src/platform/nativeShell.ts`):
  TextToSpeech, SpeechRecognition, LocalNotifications, SystemBars. Android WebView has no `speechSynthesis`
  or `Notification`, so without them listening exercises would be silent; SystemBars tints the strip
  behind the status/navigation bars so it follows the page colour.
- `android/app/src/main/java/com/tumenaksu/lingua/MainActivity.java` — edge-to-edge + keyboard margins.
- Icons/splash: `npm run icons` (from `assets/`, generated from the app's own icons).

## Release (on the server)

```bash
cd mobile-shell && npm ci
npm run release -- 0.1.1      # → dist/Love-Vox-0.1.1.apk (+ .sha256), versionCode +1
```

Needs Android SDK build-tools 35.0.0 (`ANDROID_HOME`, default `~/android-sdk`), a JDK
(`JAVA_HOME`, default `~/android-tools/jdk`) and the signing key
`~/ankaokul-secrets/lingua-mobile.keystore` (alias `lingua-mobile`, password in the `.README`
next to it). **Back up the keystore**: an APK signed with another key cannot update the installed app.

Publish it as a GitHub release with **two** assets — the versioned file and a copy named
`Love-Vox.apk`, which the welcome page's "APK indir" button downloads via
`releases/latest/download/Love-Vox.apk` (src/platform/pwa.ts):

```bash
cp dist/Love-Vox-0.1.1.apk dist/Love-Vox.apk
gh release create mobile-v0.1.1 dist/Love-Vox-0.1.1.apk dist/Love-Vox-0.1.1.apk.sha256 dist/Love-Vox.apk
```

Finally bump `"version"` in `public/android.json` (app repo root) to the new version and deploy
the web build — installed shells then show the "new Android version" banner
(`ShellUpdateBanner` in src/platform/autoUpdate.ts) on the next app open.
