# Production operations

## Required configuration

Configure these as secret values in Render; never commit them:

- `MONGODB_URI`
- `REDIS_URL`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- `SK_CENTRAL_SSO_SECRET` and `SK_CENTRAL_SERVICE_TOKEN`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`
- `TURN_URLS` and `TURN_SHARED_SECRET`
- `MALWARE_SCAN_URL` and `MALWARE_SCAN_TOKEN`
- `GEMINI_API_KEY` when AI is enabled

Set `FRONTEND_URL=https://connect.sk-hub.in`, `BACKEND_URL` to the deployed Render service, and keep `ALLOWED_ORIGINS` limited to owned origins.

Set `REQUIRE_REDIS=true`, `REQUIRE_PERSISTENT_MEDIA=true`, and `REQUIRE_TURN=true` only after their credentials are present. These production gates deliberately stop startup or readiness instead of silently degrading chat delivery, media durability, or calls.

## Mandatory one-time actions

Repository changes cannot rotate third-party credentials. Before production rollout:

1. Rotate the previously exposed Redis password/token at the provider.
2. Update Render's `REDIS_URL` and revoke the old credential.
3. Provision Cloudinary and replace all placeholder values.
4. Provision Coturn or a managed TURN service with TLS-capable `turns:` endpoints.
5. Provision a malware scanner compatible with the raw-body scan contract. It must return JSON `{"clean": true}` for accepted content.
6. Confirm the SK Central service token is configured in Render.

## Deployment gate

1. Run `npm ci` in both packages.
2. Run `npm run verify`.
3. Run both production dependency audits.
4. Run `npm run test:e2e --prefix frontend`.
5. Deploy the backend and wait for `/health/ready` to return HTTP 200.
6. Deploy the frontend.
7. Verify SSO, two-user messaging/receipts, one voice call over a non-local network, one media upload, a private story, and global logout.

Do not use `/health` as the deployment gate; it is retained for compatibility. Readiness checks MongoDB and enforces Redis and Cloudinary when their `REQUIRE_*` production gates are enabled.

## Rollback

Deploy the preceding known-good saved version. Database additions are backward compatible and TTL-managed. Do not delete new collections during rollback. If a secret is suspected compromised, rotate it even when rolling back application code.

## Operational controls

- AI can be disabled or quota-limited through the administrator AI settings endpoints.
- Community audit entries are immutable application records and retained until an explicit retention policy is introduced.
- Completed durable jobs expire after seven days; story, notification, upload-usage, and AI-metric collections use TTL indexes.
- Upload scanning fails closed in production when `MALWARE_SCAN_REQUIRED=true`.

## Incident checks

Use request IDs from API responses to correlate structured backend logs. Check:

- `/health/ready` dependency details
- failed/retrying durable jobs
- AI error/cancellation metrics without prompt content
- community audit history
- unusual 401, 403, 413, 415, and 429 rates
