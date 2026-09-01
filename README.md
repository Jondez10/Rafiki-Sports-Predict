# Rafiki Predict ⚽🤖

AI-Powered Football Prediction & Analytical Engine built with React, Vite, Express, TypeScript, and Google Gemini API.

---

## 🌟 Features

- **Mathematical & Poisson Predictive Engine**: Poisson distribution, Elo ratings, xG metrics, and momentum modeling for verified fixtures.
- **Gemini AI Grounding & Analysis**: Real-time sports intelligence with Gemini Flash / Pro integration.
- **Firebase Firestore & Authentication**: Real-time bookmarking, user profiles, subscription tracking, and robust offline cache synchronization with jittered exponential backoff.
- **Admin Command & Health Dashboard**: Live sports API fixture sync, automated grading, ensemble diagnostics, and system monitoring.
- **Multi-language Support**: English and Swahili localization.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
```

### 3. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Open `.env` and fill in your keys:
```env
# Client-Side Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=symmetric-silicon-r2t1j.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=symmetric-silicon-r2t1j
VITE_FIREBASE_STORAGE_BUCKET=symmetric-silicon-r2t1j.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=354839059532
VITE_FIREBASE_APP_ID=1:354839059532:web:c6a5bccb491a2104aca8e9

# Server Port (Defaults to 3000)
PORT=3000

# Google Gemini API Key (Required for AI Analysis & Betting Buddy)
GEMINI_API_KEY=your_gemini_api_key_here

# Master Administrator Credentials
ADMIN_EMAIL=rafikibc1000@gmail.com
ADMIN_SECRET_KEY=your_admin_secret_password_here

# (Optional) Live Sports Data API
SPORTS_API_KEY=your_api_sports_key_here
```

### 4. Firebase Security & Credential Setup
The client-side Firebase SDK dynamically initializes using environment variables (`VITE_FIREBASE_*`).

> **Security Notice**: Never commit raw API keys or credentials to Git. If an API key was previously committed to a public repository, follow these rotation steps:
> 1. Go to the [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials) or [Firebase Console](https://console.firebase.google.com/).
> 2. Regenerate or restrict your Web API Key (HTTP referrer and API restrictions: Identity Toolkit, Cloud Firestore, etc.).
> 3. Delete or revoke the compromised key.
> 4. Add the new key into your `.env` file as `VITE_FIREBASE_API_KEY`.

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express + Vite full-stack server in development mode |
| `npm run build` | Builds the Vite frontend and bundles the Express backend (`dist/server.cjs`) |
| `npm start` | Runs the production bundled backend (`dist/server.cjs`) |
| `npm run lint` | Runs TypeScript compiler checks (`tsc --noEmit`) |
| `npm run test:math` | Executes the 13 mathematical defensive safety diagnostics |

---

## 🏗️ Project Structure

```
├── firebase-applet-config.json   # Client Firebase credentials
├── firestore.rules               # Firestore security rules
├── metadata.json                 # AI Studio App metadata
├── package.json                  # Dependencies & scripts
├── server.ts                     # Full-Stack Express Server & API Routes
├── src/
│   ├── App.tsx                   # Main React Application
│   ├── components/               # UI & Tab Components
│   │   ├── AdminDashboard.tsx    # Admin Control Panel
│   │   ├── PredictionsTab.tsx    # Fixtures & Predictions Feed
│   │   ├── SystemHealthTab.tsx   # Diagnostics & Sync Logs
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts                # Authenticated API Client
│   │   └── firebase.ts           # Firebase SDK & Resilient Retry Engine
│   └── server/                   # Backend Algorithms
│       ├── apiFootball.ts        # API-Football Integrations
│       ├── ensembleEngine.ts     # Ensemble Model Weighted Aggregation
│       ├── gemini.ts             # Google Gemini AI Integrations
│       ├── liveSportsEngine.ts   # Real-Time Match Registry
│       ├── mathDiagnostics.ts    # Mathematical Tests
│       └── poissonEngine.ts      # Poisson PMF / Elo / xG Algorithms
```

---

## 🔒 Deployment & Production

To run in production containers (Cloud Run, Docker, VPS):
```bash
npm run build
npm start
```
The server will bind to `0.0.0.0:3000` and serve both API endpoints and the compiled single-page frontend.
