# POS Beauty

Production-oriented retail POS for a small startup shop, built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Features

- Secure JWT cookie authentication with Admin and Cashier roles
- Dashboard with sales, returns, expenses, low stock alerts, and charts
- Fast POS screen with barcode-input scanning flow for USB scanners
- Transaction-safe sale completion with stock deduction and payment save in one transaction
- Thermal-style receipt printing and receipt reprint from sales history
- Product, inventory, expense, user, return, report, and settings modules
- Profit, sales, stock, expense, and cashier reports with PDF and Excel export

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn-style reusable UI primitives
- PostgreSQL
- Prisma ORM
- React Hook Form + Zod
- Recharts
- react-to-print
- jsPDF + jspdf-autotable
- xlsx
- jsbarcode

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Create your environment file

```bash
cp .env.example .env
```

3. Set `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and `APP_URL`

4. Generate Prisma client

```bash
npm run db:generate
```

5. Run migrations

```bash
npm run db:migrate
```

6. Seed demo data

```bash
npm run db:seed
```

7. Start the app

```bash
npm run dev
```

## Seed Credentials

- Admin: `admin / admin123`
- Cashier: `cashier / cashier123`

## Available Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:push`
- `npm run db:seed`
- `npm run db:studio`

## Database Notes

- Prisma schema: [prisma/schema.prisma](./prisma/schema.prisma)
- Initial SQL migration: [prisma/migrations/202604161530_init/migration.sql](./prisma/migrations/202604161530_init/migration.sql)
- The schema stores price snapshots in `SaleItem` and `ReturnItem`
- Sales, payment save, and stock deduction happen in a single Prisma transaction
- Returns restore stock through transaction-backed stock movement records

## Vercel + Neon Deployment

1. Create a Neon PostgreSQL database
2. Copy the pooled Neon connection string into `DATABASE_URL`
3. Copy the direct Neon connection string into `DIRECT_URL`
4. Add `AUTH_SECRET` and `APP_URL` in Vercel environment variables
5. Deploy the repository to Vercel
6. Run `npx prisma migrate deploy`
7. Run `npx prisma db seed` once against production if you want starter data

## Suggested Production Env

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="a-long-random-secret-at-least-32-characters"
APP_URL="https://your-app.vercel.app"
```

## Core Flow Checklist

- Login with role-based access
- Add or edit products with unique barcodes
- Scan or search products into the POS cart
- Complete a sale and print a receipt after save
- Reduce stock automatically on sale
- Process returns and restore stock
- Track expenses
- Generate filtered reports and export to PDF or Excel

## Phase 2 Ideas

- Persist held carts across devices
- Better cashier mobile companion views
- Advanced audit logs and activity timeline
- Per-product image upload
- CSV import for products
