# THE VELORA

Premium Indian saree and ethnic-wear storefront with an administrator console, manual UPI checkout, and MongoDB-backed catalogue.

Tagline: Elegance Woven for You.

## Prerequisites

- Node.js 22 or newer
- npm
- A MongoDB Atlas cluster (or another MongoDB replica set) and permission to use the `thevelora` database
- Optional: Cloudinary credentials for production image uploads
- Optional: an SMTP account for order emails

## Installation

```bash
npm install
```

Copy the environment template and fill in real values locally. Never commit `.env.local`.

```bash
copy .env.example .env.local
```

Generate `AUTH_SECRET` with at least 32 random characters. On Windows PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Environment

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Server-only Atlas connection string. Do not prefix it with `NEXT_PUBLIC_`. |
| `MONGODB_DB_NAME` | Must be `thevelora` for this store. |
| `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` | Used only by `npm run seed:admin`. Leave the password empty after the administrator exists. |
| `AUTH_SECRET` | Signs administrator sessions. |
| `APP_URL` | Public origin, used for canonical URLs and same-origin checks. |
| `MERCHANT_UPI_ID` / `MERCHANT_UPI_NAME` | Optional server override for the merchant VPA. If both this and the admin setting are empty, UPI checkout is disabled. |
| `IMAGE_PROVIDER` | Set to `cloudinary` in production, with `IMAGE_PROVIDER_ACCOUNT`, `IMAGE_PROVIDER_KEY`, and `IMAGE_PROVIDER_SECRET`. |
| `SMTP_*` / `MAIL_FROM` | Optional customer mail. |

URL-encode the Atlas password. Select the `thevelora` database in the URI or via `MONGODB_DB_NAME`. In Atlas Network Access, allow the deployment's IP. Rotate any password that has been exposed.

The app keeps one cached Mongoose connection per server process. It does not drop collections on startup.

## Administrator setup

There is no hardcoded administrator password.

```bash
npm run seed:admin
```

The command creates a super admin only when `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` are set and that email does not already exist. Sign in at `/admin/login`, then change the password from Administrator Profile. Remove `ADMIN_INITIAL_PASSWORD` afterwards.

Optional catalogue starter, which inserts missing categories and collections without overwriting existing documents:

```bash
npm run seed:demo
```

Roles are Super Admin, Product Manager, and Order Manager. Permissions are enforced in the route handlers. Product managers cannot verify payments. Order managers cannot edit the catalogue.

## Image storage

Development, when Cloudinary is not configured, stores validated JPEG, PNG, WEBP, and GIF files under `data/uploads` and serves them from `/api/media`. That folder is gitignored.

Production refuses uploads until Cloudinary credentials are present. Uploaded names are random. The server checks the declared MIME type and the file signature, and limits files to 5 MB.

## UPI checkout

Orders store a product snapshot and server-calculated paise totals. The payment method is `upi_manual`, payment status starts as `pending`, and the order status is `awaiting_payment`.

The UPI intent is built on the server from the merchant VPA, the order number, and the server total. Opening Google Pay or a UPI app does not mark the order paid. The customer can submit a UTR and an optional receipt. An order manager or super admin marks it paid only after checking the merchant account. Rejection is stored on the order and in the audit log. Stock is reserved once at order creation and is not decremented again when payment is verified.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

The dev server runs at `http://localhost:3000`.

Browser end-to-end tests expect a running app, a seeded administrator, and a published product:

```bash
set E2E_ADMIN_EMAIL=admin@example.com
set E2E_ADMIN_PASSWORD=your-password
set PLAYWRIGHT_BASE_URL=http://localhost:3000
npx playwright install chromium
npm run test:e2e
```

`npm test` uses MongoDB Memory Server and refuses to wipe a database whose name does not end in `_test` or whose host is not local.

## Production

```bash
npm run build
npm start
```

Set `NODE_ENV=production`, `APP_URL` to the HTTPS origin, and the Atlas, auth, merchant, and Cloudinary variables in the host's secret store. The production response includes HTTPS security headers. Do not expose admin routes in marketing campaigns; `robots.txt` disallows `/admin`, `/api`, cart, checkout, and order lookup.

## Backup and recovery

Use Atlas backups or `mongodump` against `thevelora`. Restore with `mongorestore` into an empty database first and verify a product, an order, and an administrator login before pointing traffic at it. Image files in Cloudinary should be backed up with the media library export. Local `data/uploads` files exist only in development.

## Troubleshooting

- **Database is not configured:** `MONGODB_URI` is missing on the server. The browser message does not include the connection string.
- **Database connection failed:** Check the Atlas user, password encoding, IP allow list, and database name in the server log. Credentials are redacted.
- **Invalid email or password:** Run `npm run seed:admin` with a new email, or reset the password from a super admin session.
- **UPI button missing:** Add a valid VPA in Payment Settings or `MERCHANT_UPI_ID`.
- **Image upload rejected in production:** Configure Cloudinary. Development can continue with local uploads.
- **Checkout says out of stock:** Another order reserved the last unit. Cancelled unpaid orders return stock once.
