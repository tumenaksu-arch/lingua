# Kurulum: Supabase ve EAS

## Supabase (hesap + bulut senkron)
1. https://supabase.com/dashboard → **New project** oluşturun.
2. **SQL Editor** → `supabase/migrations/0001_init.sql` içeriğini yapıştırıp çalıştırın
   (ya da CLI ile: `npx supabase link --project-ref <REF> && npx supabase db push`).
3. **Authentication → Providers → Email**: açık olsun. Geliştirme sırasında "Confirm email"i kapatmak girişleri hızlandırır.
4. **Project Settings → API**'den URL ve anon key'i alın, kök dizinde `.env` oluşturun:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<REF>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```
   `.env` git'e girmez (`.gitignore`). Uygulama bu değişkenler olmadan da yerel modda çalışır.

## EAS (development build — konuşma tanıma için zorunlu)
`expo-speech-recognition` native modül içerdiği için Expo Go'da çalışmaz.
```bash
npx eas-cli@latest login
npx eas-cli@latest init                   # app.json'a projectId yazar
npx eas-cli@latest build --profile development --platform android   # APK
npx eas-cli@latest build --profile development --platform ios       # simülatör
```
Build cihaza kurulduktan sonra `npx expo start` ile dev-client'a bağlanın.
Supabase anahtarlarını EAS build'e vermek için: `npx eas-cli@latest env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL ...` (anon key public kabul edilir; RLS korur).

## CI
`.github/workflows/ci.yml`: her push/PR'da lint (0 uyarı), typecheck, jest ve Android Metro bundle derlemesi.
