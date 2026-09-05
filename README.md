# Rafiki Predict ⚽🤖

AI-Powered Football Prediction & Analytical Engine built with React, Vite, Express, TypeScript, Google Gemini API, and Multi-Model Ensemble Intelligence.

---

## 🌟 1. Overview & Architecture

**Rafiki Predict** is a full-stack, enterprise-grade sports intelligence platform. It features:
- **Poisson & xG Distribution Engine**: Computes exact goal distribution PMF, Over/Under (1.5, 2.5, 3.5), Both Teams to Score (BTTS), Match Winner (1X2), and Double Chance probabilities.
- **Multi-Model Ensemble Machine Learning**: Aggregates Weighted Poisson Regression (35%), Elo Bayesian Rating (25%), Expected Goals xG (20%), and Momentum/Fatigue Indices (20%).
- **Gemini AI Grounding & Analysis**: Server-side Google Gemini 3.7 Flash analysis for in-depth tactical previews, real-time sports intelligence, and interactive Betting Buddy Q&A.
- **Accountless Temporary VIP Access Engine**: Instant cryptographic access keys with time-based leases (1 Day, 7 Days, 30 Days), multi-currency pricing (KES, USD, EUR, GBP, NGN, GHS, ZAR, UGX, TZS), device binding, and administrative lifecycle management.
- **Administrative Control Center**: Live fixture sync, automated grading, manual settlement overrides, ensemble diagnostics, and system health telemetry.
- **Firebase Firestore & Authentication**: Real-time bookmarking, user profiles, subscription tracking, and resilient offline cache synchronization.

---

## 🛠️ 2. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion (Framer Motion), Lucide React, Recharts.
- **Backend**: Node.js, Express, tsx, esbuild, Firebase Admin SDK.
- **AI & Analytics**: Google GenAI SDK (`@google/genai`), Poisson PMF distribution, Elo Bayesian rating system.
- **Database & Auth**: Firebase Firestore, Firebase Authentication (Google, Apple, Microsoft, Email/Password, Phone OTP, Username/Password).
- **Tooling & Build**: Vite v6, TypeScript 5.8, ESLint.

---

## 🚀 3. Installation & Quick Start

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Recommended: `v20.x` or `v22.x`)
- **npm** (or **bun** / **yarn**)

### Step-by-Step Setup
1. **Clone the repository**:
   ```bash
   git clone <your-github-repo-url>
   cd <repo-folder>
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🔐 4. Environment Variables Reference

Configure these in your `.env` file for local development or in your production container environment:

| Variable | Scope | Required | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Server | Optional | Port the Express server listens on (defaults to `3000`) |
| `GEMINI_API_KEY` | Server | Recommended | Google Gemini API Key for AI predictions & Betting Buddy |
| `ADMIN_EMAIL` | Server | Optional | Master administrator contact email |
| `ADMIN_WHATSAPP` | Server | Optional | WhatsApp customer support number |
| `ADMIN_SECRET_KEY` | Server | Recommended | Master password for administrative actions & VIP approvals |
| `SPORTS_API_KEY` | Server | Optional | API-Football / RapidAPI key for real-time live fixture feeds |
| `FIREBASE_PROJECT_ID` | Server/Client | Recommended | Google Firebase project ID |
| `VITE_FIREBASE_API_KEY` | Client | Recommended | Firebase Web API key for authentication and Firestore sync |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | Optional | Firebase authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Client | Optional | Firebase project ID exposed to Vite frontend |
| `VITE_FIREBASE_STORAGE_BUCKET`| Client | Optional | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client | Optional | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Client | Optional | Firebase Web Application ID |

---

## 📜 5. Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Boots the full-stack dev server (`tsx server.ts`) on port 3000 |
| `npm run build` | Compiles Vite frontend assets (`dist/`) and bundles backend (`dist/server.cjs`) |
| `npm start` | Runs the compiled standalone production server (`node dist/server.cjs`) |
| `npm run lint` | Performs strict TypeScript type checks across the codebase (`tsc --noEmit`) |
| `npm run test:math` | Executes all 13 defensive mathematical algorithms safety tests |
| `npm run clean` | Cleans `dist/` and build artifacts |

---

## 🚢 6. Production Build & Deployment

### Building for Production
```bash
npm run build
```
This produces:
- `dist/index.html` and bundled client assets.
- `dist/server.cjs` self-contained backend bundle.

### Running in Production
```bash
npm start
```

### Docker / Cloud Run Container Deployment
The application is designed to run in containerized environments (Google Cloud Run, AWS ECS, Railway, Render, VPS):
- Set container environment variable `NODE_ENV=production`.
- The container binds to `0.0.0.0:3000`.
- Health check endpoint available at `GET /api/health`.

---

## ⚽ 7. Sports API Configuration

The application operates with a multi-layered sports data pipeline:
1. **API-Football (Direct API)**: Set `SPORTS_API_KEY` to pull live fixtures directly from API-Sports.
2. **Sports Consensus Engine**: Built-in fallback engine providing verified active schedules, live odds calculations, and dynamic fixture generation.
3. **Automated Odds Calculation**: Decimal odds are derived using true Poisson PMF with 4–8% standard bookmaker vigorish.

---

## 🔥 8. Firebase & Firestore Rules

Firestore security rules are defined in `firestore.rules`:
- **User Collections**: Read/write restricted to authenticated owner.
- **Predictions & Accumulators**: Publicly readable, writable only via server-side Admin SDK.
- **Admin Collections**: Denied all direct client access; accessed strictly through authenticated backend routes.

Deploy rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 🛡️ 9. Important Security Requirements

1. **Client/Server Secret Separation**: All sensitive API keys (`GEMINI_API_KEY`, `ADMIN_SECRET_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`) are kept exclusively on the server and are NEVER exposed to the browser client.
2. **Admin Authorization**: All administrative endpoints (`/api/admin/*`, `/api/predictions/generate-ai`, etc.) enforce server-side validation against `ADMIN_SECRET_KEY` and Firebase Admin claims.
3. **Masked VIP Content**: AI predictions, probability indicators, momentum graphs, and value picks are strictly masked on the client until payment/access key verification is confirmed.
4. **Git Hygiene**: `.gitignore` ensures that `.env` files, build caches, and private tokens are never committed to version control.

---

## 📄 10. License & Support

- **Support Email**: `rafikibc1000@gmail.com`
- **WhatsApp Support**: `+254716483642`
- **Copyright**: © 2026 Rafiki Predict. All rights reserved.
