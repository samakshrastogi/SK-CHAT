# Connect - Premium Real-Time Messaging Platform

Connect is an original, feature-packed messaging platform that features compact glassmorphic styling, robust real-time communication, WebRTC calling (audio & video), expiring status updates, and multiple integrated AI features.

---

## Technical Stack & Features

- **Frontend**: Vite, React 19, TypeScript, Tailwind CSS, TanStack Query, Zustand, Axios, React Hook Form, Framer Motion, Socket.io Client.
- **Backend**: Node.js, Express.js, TypeScript, MongoDB (via Mongoose), Socket.io, JWT with Rotation, Multer, Helmet, Morgan, Rate Limiting, Compression.
- **Real-Time Layer**: Socket.io for presence, typing indicators, read receipts, and WebRTC signaling.
- **Calling**: WebRTC PeerConnection exchanging camera/mic streams.
- **AI Integrations**: Gemini API (with local text simulation fallbacks) providing chat summaries, tone shifts, translations, and smart replies.

---

## Installation & Running Locally

Ensure Node.js (v20+) and a running MongoDB instance (on default port `27017`) are ready.

### 1. Backend Server Setup
```bash
cd backend
npm install
```

Create a `.env` file under `backend/` using the instructions inside `.env.example`:
```bash
cp .env.example .env
```

**Seed Default Verified Users**:
```bash
npm run seed
```
This populates MongoDB with Alice, Bob, Charlie, and Admin accounts with initial chats, status logs, and calls.

**Start Backend Development**:
```bash
npm run dev
```
The backend server runs on `http://localhost:5000`.

---

### 2. Frontend client Setup
```bash
cd ../frontend
npm install
```

**Start Frontend Development**:
```bash
npm run dev
```
The React web client runs on `http://localhost:5173`.

---

## Seeder Credentials for Testing

You can open two separate browsers (or one browser and one private incognito window) to test real-time chatting and WebRTC video calls:

- **Common Password for Seeded Users**: `password123`
- **Seeded User accounts**:
  - `alice@connect.chat` (username: `alice`)
  - `bob@connect.chat` (username: `bob`)
  - `admin@connect.chat` (username: `admin` - holds moderator credentials for the admin analytics panel)

---

## Deploying with Docker Compose

To orchestrate the database, API server, and Vite client with a single command, run this in the root folder:

```bash
docker-compose up --build
```
This boots:
1. **Database**: MongoDB container exposing `27017`.
2. **Backend**: Node container exposing `5000`.
3. **Frontend**: React client container exposing `5173`.
