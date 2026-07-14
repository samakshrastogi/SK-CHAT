# Native deployment: Render + Vercel

Docker is optional for this repository. The recommended production layout is:

- `backend`: native Node web service on Render
- `frontend`: Vite static application on Vercel
- MongoDB Atlas: persistent database
- Cloudinary: persistent media storage
- Redis: optional Socket.IO scaling adapter

## Run locally without Docker

Install Node.js 20 or newer, then run these commands from the repository root:

```bash
npm run setup
npm run dev
```

The backend runs on `http://localhost:5000` and the frontend runs on
`http://localhost:5174`. Set `MONGODB_URI` in `backend/.env` to either MongoDB
Atlas or a locally installed MongoDB server.

Build both applications with:

```bash
npm run build
```

## Render backend

### Blueprint deployment

In Render, choose **New > Blueprint**, connect this repository, and use the
root `render.yaml`. It defines a native Node service and does not use the
Dockerfiles.

Render will prompt for secret environment variables. Use the values described
in `backend/.env.production.example`. Empty optional integrations can be added
later in the service's Environment page.

### Existing Render service

Change the service from Docker to a new native Node web service with these
settings:

```text
Language: Node
Branch: main
Root Directory: backend
Build Command: npm ci --include=dev && npm run build
Start Command: npm start
Health Check Path: /health
```

Do not set a Dockerfile path, Docker context, or Docker command. Do not set
`PORT`; Render supplies it automatically and the backend already reads it.

Required environment variables:

```text
NODE_ENV=production
MONGODB_URI=<MongoDB Atlas connection string>
FRONTEND_URL=<Vercel production origin, without a trailing slash>
ALLOWED_ORIGINS=<comma-separated allowed frontend origins>
BACKEND_URL=<Render service origin, without a trailing slash>
JWT_ACCESS_SECRET=<long random value>
JWT_REFRESH_SECRET=<different long random value>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

For SK Central login, email, AI, media, Redis, Google login, and push
notifications, add the corresponding variables from
`backend/.env.production.example`.

Cloudinary should be configured in production. Files stored directly under
`backend/uploads` are not durable on Render's ephemeral filesystem.

## Vercel frontend

Import the same repository as a Vercel project and configure:

```text
Framework Preset: Vite
Root Directory: frontend
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
```

The checked-in `frontend/vercel.json` provides the SPA fallback required by
React Router, so refreshing routes such as `/chat` does not return a 404.

Add these Vercel environment variables for Production and Preview as needed:

```text
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
VITE_SOCKET_URL=https://YOUR-RENDER-SERVICE.onrender.com
VITE_SK_CENTRAL_AUTH_URL=https://www.sk-hub.in/api
VITE_SK_CENTRAL_LOGIN_URL=https://www.sk-hub.in/login
VITE_SK_CENTRAL_PROFILE_URL=https://www.sk-hub.in/profile
VITE_GOOGLE_CLIENT_ID=<optional Google web client ID>
```

After the first Vercel deployment, copy its production origin into Render's
`FRONTEND_URL` and `ALLOWED_ORIGINS`, then redeploy the backend. Use only URL
origins in these backend variables (for example, `https://chat.example.com`),
not paths such as `/api`.
