# SK Connect

SK Connect is the real-time messaging application for the SK ecosystem. Production identity is provided exclusively by SK Central.

## Capabilities

- Direct and group messaging with cursor pagination, idempotent sends, offline outbox retries, drafts, search, reactions, polls, receipts, scheduled delivery, and per-chat preferences.
- Authorized Socket.IO rooms and signaling.
- Voice/video calls with short-lived TURN credentials, ring timeouts, call history, screen sharing, and device selection support.
- Persistent per-device E2EE identity keys with authorized key exchange and fingerprints.
- Private 24-hour stories with persisted polls, Q&A, sliders, views, likes, and replies.
- Communities with capability-based roles, channels, join approval, bans, audit logs, events, RSVPs, and durable reminders.
- Opt-in AI with server-authorized context, quotas, cancellation, content-free metrics, and administrator controls.
- Notification preferences, quiet hours, durable web-push retries, and accessible in-app feedback.

## Local setup

Requirements: Node.js 20 or 22, MongoDB, and optionally Redis.

```bash
npm run setup
copy backend/.env.example backend/.env
copy frontend/.env.example frontend/.env
npm run dev
```

Use non-placeholder secrets and local service URLs in the environment files. Local/password/mock authentication routes are intentionally unavailable; sign in through SK Central.

## Verification

```bash
npm run verify
npm audit --omit=dev --prefix backend
npm audit --omit=dev --prefix frontend
npm run test:e2e --prefix frontend
```

The main CI workflow runs lint, unit/integration tests, TypeScript production builds, production dependency audits on Node 20 and 22, plus Playwright browser smoke tests.

## Production

Render configuration is defined in `render.yaml`. Required secrets remain `sync: false`; deployment intentionally fails when identity, JWT, database, Cloudinary, TURN, or required malware-scanner configuration is missing.

- Liveness: `/health/live`
- Readiness: `/health/ready`
- Compatibility health endpoint: `/health`

See [Production operations](docs/PRODUCTION_OPERATIONS.md) for deployment, dependency, rollback, and secret-rotation procedures.
