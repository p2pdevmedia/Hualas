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
