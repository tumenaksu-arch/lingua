# Lingua mobile shell (Android)

A Capacitor 7 "web shell", same pattern as the EduPilot app: the APK contains no app code,
it opens **https://ankaxai.ai/lingua/** in a WebView. Every web deploy reaches the phone on
the next launch; a new APK is needed only when this folder changes (plugins, icons, Android code).

- `capacitor.config.json` — `server.url`, package `com.tumenaksu.lingua`; `www/index.html` is the offline page.
- Native plugins the web build uses inside the shell (`src/platform/nativeShell.ts`):
  TextToSpeech, SpeechRecognition, LocalNotifications. Android WebView has no `speechSynthesis`
  or `Notification`, so without them listening exercises would be silent.
- `android/app/src/main/java/com/tumenaksu/lingua/MainActivity.java` — edge-to-edge + keyboard margins.
- Icons/splash: `npm run icons` (from `assets/`, generated from the app's own icons).

## Release (on the server)

```bash
cd mobile-shell && npm ci
npm run release -- 0.1.1      # → dist/Lingua-0.1.1.apk (+ .sha256), versionCode +1
```

Needs Android SDK build-tools 35.0.0 (`ANDROID_HOME`, default `~/android-sdk`), a JDK
(`JAVA_HOME`, default `~/android-tools/jdk`) and the signing key
`~/ankaokul-secrets/lingua-mobile.keystore` (alias `lingua-mobile`, password in the `.README`
next to it). **Back up the keystore**: an APK signed with another key cannot update the installed app.

Publish the APK as a GitHub release asset (`gh release create mobile-v<x.y.z> dist/Lingua-<x.y.z>.apk`).
