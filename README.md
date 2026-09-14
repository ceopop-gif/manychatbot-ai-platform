# ChatMarathon

ChatMarathon is a Node.js application for managing multiple LINE OA accounts, AI admins, skills, conversations, and ChatPOS payments.

## Runtime

This project targets EasyPanel only:

- Node.js `>=22.13.0`
- PostgreSQL
- Cloudinary for new file and media uploads
- S3-compatible object storage such as MinIO or AWS S3 for reading legacy uploads
- Vinext/Vite for the web application

## Environment

Copy `.env.example` to `.env` and set the service credentials:

- `DATABASE_URL`: PostgreSQL connection string
- `DATABASE_POOL_MAX`: PostgreSQL pool size
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`: legacy object storage settings for files uploaded before Cloudinary
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: legacy object storage credentials
- `S3_FORCE_PATH_STYLE`: legacy MinIO/S3 path-style setting
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary upload credentials
- `CLOUDINARY_URL`: alternative to the three Cloudinary variables above
- `ADMINOA_ENCRYPTION_KEY`: Base64URL-encoded 32-byte key used to encrypt provider and channel secrets
- `SMSUP_USERNAME`, `SMSUP_PASSWORD`, `SMSUP_OTC_ID`: SMS Up credentials and OTP configuration from the SMS Up console
- `SMSUP_BASE_URL`: SMS Up API base URL (defaults to `https://pub.smsup-plus.com`)

Never commit `.env` or place provider, LINE, payment, database, or storage credentials in source files.

## Authentication

- Store login: `/login`
- Platform Admin login: `/admin/login`
- Create an account: `/register`
- Platform Admin dashboard: `/admin` (เฉพาะผู้ใช้ role `admin`)
- Platform Admin pages: `/admin/merchants`, `/admin/access`, `/admin/billing`, `/admin/health`, `/admin/settings`
- Merchant dashboard: `/store` (ผู้ใช้ที่สมัครใหม่จะเป็น role `merchant`)
- Merchant pages: `/store/inbox`, `/store/admins`, `/store/skills`, `/store/ai`, `/store/line`, `/store/payments`, `/store/reports`, `/store/systems`
- Platform Admin เห็นภาพรวมร้านค้า ผู้ใช้งาน แพ็กเกจ รายได้ และสุขภาพระบบ ส่วน Merchant เห็นเฉพาะข้อมูลร้านและ workspace ของตัวเอง
- ผู้ใช้ Platform Admin เพิ่มได้จาก `/admin/access` โดยแบ่งเป็น `Owner` (สิทธิ์เต็ม), `Manager` (ภาพรวม/ร้านค้า/รายได้/สุขภาพระบบ) และ `Support` (ภาพรวม/ร้านค้า/สุขภาพระบบ) พร้อมกำหนด permission รายเมนู
- ระบบตรวจ permission ที่ฝั่ง server ของทั้งหน้า Admin และ API ก่อนอนุญาตเข้าถึงข้อมูล
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

The production start command listens on `0.0.0.0:3000` by default. EasyPanel should provide `DATABASE_URL`, the S3 settings, `ADMINOA_ENCRYPTION_KEY`, the SMS Up OTP settings, and any application authentication configuration as environment variables.

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
