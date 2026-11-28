# Login (Supabase + Google + Apple + email)

El login es obligatorio. La URL y la publishable key del proyecto están en `apps/mobile/src/auth/supabase.ts`
(son públicas). Para desarrollar sin cuentas: `EXPO_PUBLIC_SIN_LOGIN=1`.

## 1. Supabase
1. Crear un proyecto gratis en https://supabase.com.
2. SQL Editor → pegar `supabase/migrations/0001_cuentas.sql` → Run.
3. Project Settings → API: copiar **Project URL** y la **publishable key** (`sb_publishable_…`, o la `anon` si es un proyecto viejo).
4. Authentication → Emails (requiere SMTP propio): en **Confirm signup** (primer ingreso) y en **Magic link or OTP**
   (siguientes) poner asunto `Tu código de R-Info` y en Source pegar `supabase/templates/codigo-acceso.html`.
   Authentication → URL Configuration → Site URL: `rinfo://` (si queda `localhost:3000`, los links de mails viejos fallan).
5. Authentication → Providers → Email: dejarlo activo. El correo de prueba de Supabase manda pocos mails por hora:
   para muchos alumnos, configurar un SMTP propio (Resend, Brevo, etc.) en Authentication → SMTP.

## 2. Google (Android)
En https://console.cloud.google.com, proyecto nuevo → Google Auth Platform:
1. Branding / Audience: tipo **Externo**, publicar la app.
2. Clients → crear **Aplicación web** → copiar Client ID y Client secret.
   Cargarlos en Supabase → Authentication → Providers → Google (activar).
3. Clients → crear **Android** con paquete `com.eduardovilela.rinfo` y el SHA-1 que muestra el resumen
   del workflow "APK Android" en GitHub Actions.
   Para Play Store, agregar otro cliente Android con el SHA-1 de *Play Console → Integridad de la app → Firma de apps*.

## 3. Apple (iOS)
Solo para publicar en App Store: Apple Developer → Identifiers → activar *Sign in with Apple* en `com.eduardovilela.rinfo`,
y en Supabase → Providers → Apple agregar `com.eduardovilela.rinfo` en *Client IDs*.

## 4. Secretos en GitHub
Repo → Settings → Secrets and variables → Actions → New repository secret:
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (el de tipo *Aplicación web*)

Después, re-ejecutar el workflow o hacer un push.

## Ver cuánta gente la usa
En Supabase → SQL Editor: `select * from uso_resumen;` o `select * from perfiles order by ultimo_acceso desc;`
