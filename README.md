# Hualas

Full-stack application for Club Hualas built with Next.js 14, Prisma and PostgreSQL.

## Development

1. Copy `.env.example` to `.env` and set the values (database connection, NextAuth secret, Google OAuth client credentials if using Google sign-in, Mercadopago token, Pinata JWT for IPFS uploads, and `BLOB_READ_WRITE_TOKEN` for private file uploads).
2. Install dependencies with `pnpm install`.
3. Generate the Prisma client: `pnpm prisma:generate`.
4. Start the dev server: `pnpm dev`.
5. Run checks with `pnpm format:check`, `pnpm lint`, `pnpm test`, and `pnpm build`.

`pnpm dev` and `pnpm build` run `scripts/copy-pdf-worker.mjs` before Next.js so
the documentary PDF viewer has the worker asset it expects.

## Native Apps

- iPhone: native SwiftUI app in `iphone/HualasMobile`; setup is in `iphone/README.md`.
- Android: native Kotlin/Compose app in `android`; setup is in `android/README.md`.
- Both native apps talk to the backend through `/api/mobile/*` bearer-token endpoints.

## Agent-Facing Docs

When adding or changing functionality, update the docs that future agents read
first: `PROJECT_CONTEXT.md`, `ROUTE_MAP.md`, `.agent-registry.yaml`, and any
relevant platform README/API contract. New work should not be discoverable only
by searching the source tree.

Before finishing a task, agents should run `pnpm format:check` and attempt
`pnpm build`. If a command is blocked by local environment requirements, note
the exact command and reason in the final response.

## Deployment

- The production build generates Prisma Client and compiles Next.js.
- Apply pending Prisma migrations separately with `pnpm db:migrate:deploy` before or after deploy, using the intended target database.
- Make sure `DATABASE_URL` points to the target database when running migrations.
- Configure `BLOB_READ_WRITE_TOKEN` in Vercel for private Blob uploads such as profile photos, receipts, activity media, news media, and professor invoices.
- If a deployment is already serving an older schema, run `pnpm db:migrate:deploy` once against that database and redeploy.

## Google OAuth on Vercel

- `NEXTAUTH_URL` in `.env.example` is for local development only: `http://localhost:3000`.
- In Vercel, prefer leaving `NEXTAUTH_URL` unset so NextAuth can infer the current host. If you set it, it must exactly match the origin that serves sign-in for that environment.
- In Google Cloud, the OAuth client must authorize the exact callback URL used by NextAuth:
  - local: `http://localhost:3000/api/auth/callback/google`
  - production: `https://your-domain.com/api/auth/callback/google`
- Preview or staging deployments need their own authorized callback URL. If Google OAuth is not configured for that hostname, disable Google sign-in there and use credentials auth for testing.
- If the Vercel domain, `NEXTAUTH_URL`, and Google authorized redirect URI do not match exactly, Google sign-in can fail with `OAUTH_CALLBACK_ERROR` / `invalid_grant`.

## Mercado Pago environments

- `MP_ENVIRONMENT=testing` usa `MP_PUBLIC_KEY` y `MP_ACCESS_TOKEN`.
- `MP_ENVIRONMENT=production` usa `MERCADOPAGO_PUBLIC_KEY` y `MERCADOPAGO_ACCESS_TOKEN`.
- Webhooks: `MP_WEBHOOK_SECRET` para testing y `MERCADOPAGO_WEBHOOK_SECRET` para production. Usar la clave secreta generada en Mercado Pago > Tus integraciones > Webhooks.

### Opciones de Checkout Pro

- `MP_AUTO_RETURN`: `approved` (default) o `all`.
- `MP_BINARY_MODE`: `true/false` para aceptar/rechazar sin pendientes.
- `MP_MAX_INSTALLMENTS`: cuotas máximas ofrecidas.
- `MP_PREFERENCE_EXPIRES_MINUTES`: vencimiento de la preferencia.
- `MP_EXCLUDED_PAYMENT_METHODS`: IDs separados por coma.
- `MP_EXCLUDED_PAYMENT_TYPES`: IDs separados por coma.

## Push notifications

Las push web usan PushAlert.

Agregá al `.env.local`:

- `PUSHALERT_REST_API_KEY`: clave REST para enviar notificaciones desde el servidor.

La app carga el script público de PushAlert en el layout y guarda el `subscriber_id` de cada navegador para poder enviarle notificaciones segmentadas. Las notificaciones in-app siguen funcionando aunque falte esta variable, pero el envío push no.
