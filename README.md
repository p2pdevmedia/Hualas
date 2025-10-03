# Hualas

Full-stack application for Club Hualas built with Next.js 14, Prisma and PostgreSQL.

Esta web se desarrolló 100% desde PromptAI en Codex, el despliegue se realiza con Vercel, el código está alojado en un repositorio GIT y la base de datos se encuentra en neon.com.

## Development

1. Copy `.env.example` to `.env` and set the values (database connection, NextAuth secret, Mercadopago token and Pinata JWT for IPFS uploads).
2. Install dependencies with `pnpm install`.
3. Generate the Prisma client: `pnpm prisma:generate`.
4. Start the dev server: `pnpm dev`.
