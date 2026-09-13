# ChatMarathon

ChatMarathon is a Node.js application for managing multiple LINE OA accounts, AI admins, skills, conversations, and ChatPOS payments.

## Runtime

This project targets EasyPanel only:

- Node.js `>=22.13.0`
- PostgreSQL
- S3-compatible object storage such as MinIO or AWS S3
- Vinext/Vite for the web application

## Environment

Copy `.env.example` to `.env` and set the service credentials:

- `DATABASE_URL`: PostgreSQL connection string
- `DATABASE_POOL_MAX`: PostgreSQL pool size
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`: object storage settings
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: object storage credentials
- `S3_FORCE_PATH_STYLE`: use `true` for MinIO and most local S3-compatible services
- `ADMINOA_ENCRYPTION_KEY`: Base64URL-encoded 32-byte key used to encrypt provider and channel secrets

Never commit `.env` or place provider, LINE, payment, database, or storage credentials in source files.

## Authentication

- Login: `/login`
- Create an account: `/register`
- Protected admin dashboard: `/admin`
- Passwords are stored as salted `scrypt` hashes; plaintext passwords are never stored or returned.
- Sessions use random, database-hashed tokens in an `HttpOnly`, `SameSite=Strict` cookie and expire after seven days.
- Login attempts are rate-limited and accounts are temporarily locked after repeated failures.

Run `npm run db:migrate` before first login so PostgreSQL has the `auth_users` and `auth_sessions` tables. Production deployments must use HTTPS so the session cookie can use the `Secure` flag.

## Local commands

```bash
npm install
npm run db:migrate
npm run dev
```

The development server listens on `http://localhost:5173` by default. Set `PORT` in `.env` when another service is using that port.

## Production commands

```bash
npm install
npm run db:migrate
npm run build
npm start
```

The production start command listens on `0.0.0.0:3000` by default. EasyPanel should provide `DATABASE_URL`, the S3 settings, `ADMINOA_ENCRYPTION_KEY`, and any application authentication configuration as environment variables.

## Database

The PostgreSQL schema is defined in `db/schema.pg.ts` and migrations are generated in `drizzle-pg/`.

```bash
npm run db:generate
npm run db:migrate
```

Migrations are additive and should be reviewed before applying them to a database containing production data.

## Features

- Multiple LINE OA accounts per workspace
- AI provider configuration for OpenAI, Anthropic, Gemini, and compatible APIs
- Versioned AI admins and skills with document knowledge
- Conversation routing, human takeover, and webhook safety checks
- ChatPOS payment links and webhook status updates
- S3-compatible document storage

The LINE webhook route is `/api/webhooks/line/:webhookKey`.
