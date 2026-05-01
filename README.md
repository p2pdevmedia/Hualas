# Hualas

Full-stack application for Club Hualas built with Next.js 14, Prisma and PostgreSQL.

## Development

1. Copy `.env.example` to `.env` and set the values (database connection, NextAuth secret, Mercadopago token and Pinata JWT for IPFS uploads).
2. Install dependencies with `pnpm install`.
3. Generate the Prisma client: `pnpm prisma:generate`.
4. Start the dev server: `pnpm dev`.


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


## Web Push notifications

Notificaciones push usan VAPID self-hosted (sin servicios pagos). Generar las keys una sola vez con:

```bash
npx web-push generate-vapid-keys
```

Y agregar al `.env.local`:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: clave pública (se expone al cliente).
- `VAPID_PRIVATE_KEY`: clave privada (server-only, no commitear).
- `VAPID_SUBJECT`: `mailto:operador@hualas.com` o URL `https://hualas.com` que identifica al operador del servicio.

Sin estas variables el flujo de subscribe arroja error en runtime; la notification in-app sigue funcionando.
