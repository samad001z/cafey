# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Qaffeine Auth Setup

## Run Full App With One Command

```bash
npm run app
```

Behavior:

1. It starts Vite dev server.
2. It also starts local API server (`scripts/twilio-otp-server.mjs`) when Twilio or Google proxy credentials are present.
3. Local API server handles:
	- `POST /api/otp/send`
	- `POST /api/otp/verify`
	- `GET /api/google/reviews?placeId=...`

### Google Sign-In (Supabase)

1. In Supabase Dashboard, open Authentication > Providers > Google and enable it.
2. Add this redirect URL in Supabase and Google Console OAuth client:
	- `http://localhost:5173/login`
3. Keep your app origin in allowed JavaScript origins:
	- `http://localhost:5173`

### Customer OTP Modes

Use `VITE_OTP_PROVIDER` in `.env`:

- `supabase`: Uses Supabase phone OTP directly.
- `twilio`: Uses Twilio Verify API through local OTP server and then creates customer session via Supabase anonymous auth.

When using Twilio mode, start OTP server:

```bash
npm run otp:twilio
```

Required env values:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

### Bootstrap Admin and Staff Login Users

Set `SUPABASE_SERVICE_ROLE_KEY` in `.env`, then run:

```bash
npm run bootstrap:users
```

This creates/updates demo users and profile roles for admin and staff so login pages work immediately.

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for a secure production setup (Vercel + Render), required environment variables, and leak-prevention checklist.
