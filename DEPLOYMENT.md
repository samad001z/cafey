# Qaffeine Deployment Guide

## Recommended Production Setup

Use two services:

1. Frontend: Vercel (Vite React app)
2. API helper server: Render Web Service (Node server for OTP/Google reviews/service-role fallbacks)

This split is the safest and simplest way to deploy this project.

## 1) Frontend on Vercel

- Root directory: `qaffeine-web`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20+

Set these environment variables in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OTP_PROVIDER` (usually `supabase` in production unless Twilio mode is required)
- `VITE_OTP_API_BASE_URL` (Render API URL if using helper API)
- `VITE_GOOGLE_PLACE_ID` (optional)
- `VITE_RAZORPAY_KEY_ID`
- `VITE_DEMO_ADMIN_EMAIL` (optional)
- `VITE_DEMO_ADMIN_PASSWORD` (optional)
- `VITE_DEMO_STAFF_EMPLOYEE_ID` (optional)
- `VITE_DEMO_STAFF_PASSWORD` (optional)

## 2) API helper on Render

Create a Web Service from the same repo:

- Runtime: Node
- Build command: `npm ci`
- Start command: `node scripts/twilio-otp-server.mjs`
- Root directory: `qaffeine-web`

Set these environment variables in Render:

- `OTP_SERVER_PORT` = `10000` (or use Render default `PORT` mapping)
- `OTP_ALLOWED_ORIGIN` = your frontend domain (e.g. `https://your-app.vercel.app`)
- `TWILIO_ACCOUNT_SID` (if Twilio mode enabled)
- `TWILIO_AUTH_TOKEN` (if Twilio mode enabled)
- `TWILIO_VERIFY_SERVICE_SID` (if Twilio mode enabled)
- `GOOGLE_PLACES_API_KEY` (optional for Google review proxy)
- `GOOGLE_PLACE_ID` (optional)
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (required for service-role fallback endpoints)

Important: Never expose `SUPABASE_SERVICE_ROLE_KEY` in Vercel frontend variables.

## 3) Supabase Production Checklist

- Enable Row Level Security policies required by orders, reviews, attendance, reservations.
- Enable Google OAuth provider and configure redirect URLs.
- Configure phone auth or use Twilio helper mode.
- Run project migrations under `supabase/migrations`.

## 4) Security Checklist Before Go-Live

- Do not commit `.env` files.
- Rotate any previously exposed keys immediately.
- Use production Razorpay key (`rzp_live_...`) only in production env.
- Ensure all asset URLs are HTTPS (avoid localhost URLs in checkout metadata).
- Restrict CORS origins in backend (`OTP_ALLOWED_ORIGIN`).

## 5) Smoke Test After Deploy

- Login (customer/staff/admin)
- Menu order + Razorpay flow + receipt render
- Staff dashboard order visibility
- Admin dashboard live metrics/reviews
- QR table flow (scan and manual fallback)

## 6) Optional: Deploy Without Helper API

If you use only Supabase-native auth/features and no Twilio/Google proxy/service-role fallbacks:

- Deploy frontend only on Vercel.
- Remove reliance on `VITE_OTP_API_BASE_URL` endpoints.
