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


## Push notifications

Las push web usan PushAlert.

Agregá al `.env.local`:

- `PUSHALERT_REST_API_KEY`: clave REST para enviar notificaciones desde el servidor.

La app carga el script público de PushAlert en el layout y guarda el `subscriber_id` de cada navegador para poder enviarle notificaciones segmentadas. Las notificaciones in-app siguen funcionando aunque falte esta variable, pero el envío push no.
