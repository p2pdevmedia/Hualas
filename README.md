# Hualas

Full-stack application for Club Hualas built with Next.js 14, Prisma and PostgreSQL.

## Development

1. Copy `.env.example` to `.env` and set the values (database connection, NextAuth secret, Google OAuth client credentials if using Google sign-in, Mercadopago token and Pinata JWT for IPFS uploads).
2. Install dependencies with `pnpm install`.
3. Generate the Prisma client: `pnpm prisma:generate`.
4. Start the dev server: `pnpm dev`.

## Deployment

- The production build applies pending Prisma migrations first with `pnpm db:migrate:deploy`.
- Make sure `DATABASE_URL` points to the target production database before deploying.
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
