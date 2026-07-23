<div align="center">
  <img src="./public/Bls-rm.png" alt="BLISSORA logo" width="180" />

  <h1>POS Cosmetics</h1>

  <p>
    <strong>BLISSORA Retail POS</strong><br />
    A modern point-of-sale, inventory, returns, expense, and reporting system
    for cosmetics and beauty-product retailers.
  </p>

  <p>
    <a href="https://nextjs.org/">
      <img src="https://img.shields.io/badge/Next.js-16.2.4-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16.2.4" />
    </a>
    <a href="https://www.typescriptlang.org/">
      <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
    </a>
    <a href="https://www.prisma.io/">
      <img src="https://img.shields.io/badge/Prisma-7.7.0-2D3748?logo=prisma&logoColor=white" alt="Prisma 7.7.0" />
    </a>
    <a href="https://www.postgresql.org/">
      <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL with Neon" />
    </a>
    <a href="https://tailwindcss.com/">
      <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
    </a>
  </p>
</div>

---

## Table of Contents

- [Overview](#overview)
- [Platform Support](#platform-support)
- [Features](#features)
- [Role-Based Access](#role-based-access)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Demo Accounts](#demo-accounts)
- [Available Scripts](#available-scripts)
- [Database Design](#database-design)
- [Core Business Workflows](#core-business-workflows)
- [Application Routes](#application-routes)
- [Receipt and Thermal-Printer Setup](#receipt-and-thermal-printer-setup)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Quality Checks](#quality-checks)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

## Overview

POS Cosmetics is a production-oriented retail management application built for small and growing cosmetics shops. It combines daily cashier operations and back-office administration in one desktop-first web application.

The system supports product and barcode management, stock tracking, sales, partial returns, expenses, user accounts, shop settings, receipts, and filterable management reports. Historical sale and return records keep product and price snapshots so later product changes do not alter past transactions.

## Platform Support

> [!IMPORTANT]
> POS Cosmetics is designed for fixed desktop and laptop workstations used inside a cosmetics shop.
>
> The current version is optimized for cashier and administrative workflows on larger screens and is **not fully responsive for mobile phones or tablets**.
>
> For the intended experience, use a modern desktop browser. Mobile responsiveness is outside the scope of this desktop release.

## Features

### Dashboard

- Today's sales value and completed-sale count
- Active-product and low-stock summaries
- Today's operating expenses
- Recent transactions and returns
- A 30-day sales-versus-returns chart
- Role-aware dashboard data for Admin and Cashier users

### Point of Sale

- Search products by name or barcode
- USB barcode-scanner input flow
- Add products directly from the stock browser
- Change quantities and apply item-level discounts
- Apply a cart-level discount
- Accept cash and card payments
- Calculate the paid amount and balance
- Add optional transaction notes
- Complete the sale and reduce stock in one database transaction
- Reprint recently completed receipts

### Products and Inventory

- Create and edit products
- Unique barcode validation
- Automatic barcode and internal-code generation
- Buying price, selling price, category, and stock-threshold management
- Active and inactive product states
- Low-stock detection using each product's configured limit
- Manual stock-in and stock-out adjustments
- Stock-movement history with before-and-after quantities
- Safe product deletion: products with transaction history are deactivated instead of removing their historical references

### Returns

- Find the original sale by invoice number
- Process full or partial item returns
- Prevent returns above the remaining returnable quantity
- Calculate refund amounts from historical sale values
- Restore stock and record the stock movement transactionally
- Keep a searchable return history

### Expenses

- Create, edit, filter, and delete expense records
- Organize expenses by category
- Track who created each expense
- Filter records by date range
- Display totals for the selected period

### Reports

- Daily sales
- Weekly sales
- Monthly sales
- Gross product margin based on historical buying-price snapshots
- Best-selling products
- Current stock
- Expenses
- Sales by cashier
- Date-range and optional cashier filtering
- PDF and Excel export

### Users and Settings

- Separate Admin and Cashier accounts
- Secure password hashing with bcrypt
- Activate or deactivate user access
- Configure shop name, address, phone number, and receipt text
- Configure one to three receipt copies
- Sri Lankan Rupee formatting (`LKR` / `Rs.`)

### Receipts

- Browser-printable receipt layout
- Direct ESC/POS thermal printing through QZ Tray
- Optional receipt logo and invoice barcode
- Configurable printer name, encoding, paper feed, and automatic cut
- Browser-print fallback when direct thermal printing is unavailable

## Role-Based Access

| Module | Admin | Cashier |
| --- | :---: | :---: |
| Dashboard | ✅ | ✅ |
| Sales / POS | ✅ | ✅ |
| Returns | ✅ | ✅ |
| Products | ✅ | — |
| Inventory | ✅ | — |
| Reports and exports | ✅ | — |
| Expenses | ✅ | — |
| Users | ✅ | — |
| Settings | ✅ | — |

Access is enforced in navigation, request middleware, protected pages, and sensitive API routes.

## Technology Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16.2.4 App Router |
| UI runtime | React 19.2.4 |
| Language | TypeScript 5 with strict type checking |
| Styling | Tailwind CSS 4 |
| UI components | Radix UI primitives and reusable shadcn-style components |
| Icons | Lucide React |
| Forms | React Hook Form |
| Validation | Zod |
| Database | PostgreSQL |
| Hosted database | Neon-compatible Prisma adapter |
| ORM | Prisma 7.7 |
| Authentication | Signed JWT session cookie and bcrypt password hashing |
| Charts | Recharts |
| PDF export | jsPDF and jspdf-autotable |
| Excel export | SheetJS (`xlsx`) |
| Receipt barcode | JsBarcode |
| Thermal printing | QZ Tray and raw ESC/POS commands |
| Date utilities | date-fns |

## Architecture

```mermaid
flowchart TB
    UI["Next.js App Router UI"]
    Entry["Server Actions and API Routes"]
    Services["Services and Zod Validation"]
    Prisma["Prisma ORM"]
    Database[("PostgreSQL / Neon")]
    QZ["QZ Tray"]
    Printer["ESC/POS Thermal Printer"]

    UI --> Entry
    Entry --> Services
    Services --> Prisma
    Prisma --> Database
    UI --> QZ
    QZ --> Printer
```

The UI uses Server Components for data-heavy pages and Client Components for interactive workflows such as checkout, forms, returns, and printing.

Server actions and route handlers authorize requests before calling the service layer. The service layer validates inputs and manages database transactions.

## Getting Started

### Prerequisites

- Node.js `20.9.0` or newer
- npm
- A PostgreSQL database, such as Neon
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/prashankulathunga/POS-Cosmatics.git
cd POS-Cosmatics
```

### 2. Create the Environment File

Create a `.env` file in the project root before installing dependencies.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
AUTH_SECRET="replace-this-with-a-random-secret-of-at-least-32-characters"
APP_URL="http://localhost:3000"
```

Generate a strong authentication secret with:

```bash
openssl rand -base64 48
```

Copy the generated value into `AUTH_SECRET`.

### 3. Install Dependencies

```bash
npm install
```

Prisma Client is generated automatically by the `postinstall` script.

### 4. Apply Development Migrations

```bash
npm run db:migrate
```

### 5. Seed Starter Data

```bash
npm run db:seed
```

### 6. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

### Required Variables

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma and the application | `postgresql://...` |
| `AUTH_SECRET` | Secret used to sign session tokens; must contain at least 32 characters | Generated random value |
| `APP_URL` | Exact public origin of the application | `http://localhost:3000` |

### Optional Receipt-Printing Variables

| Variable | Default | Description |
| --- | --- | --- |
| `QZ_PRIVATE_KEY` | — | Server-only RSA private key used to sign QZ Tray requests |
| `NEXT_PUBLIC_QZ_TRAY_SCRIPT_SRC` | QZ Tray 2.2.6 CDN URL | Browser script source for QZ Tray |
| `NEXT_PUBLIC_RECEIPT_PRINTER_NAME` | `POS-80` | Preferred installed printer name |
| `NEXT_PUBLIC_RECEIPT_ENABLE_LOGO` | `false` | Prints the configured logo when set to `true` |
| `NEXT_PUBLIC_RECEIPT_ENABLE_BARCODE` | `false` | Prints the invoice barcode when set to `true` |
| `NEXT_PUBLIC_RECEIPT_FORCE_RAW` | `true` | Sends raw ESC/POS data through QZ Tray |
| `NEXT_PUBLIC_RECEIPT_ENCODING` | `Cp437` | Character encoding used by the printer |
| `NEXT_PUBLIC_RECEIPT_LOGO_PATH` | `/Bls-rm.png` | Public path of the receipt logo |

Variables prefixed with `NEXT_PUBLIC_` are included in the browser bundle. Never store secrets in them.

## Demo Accounts

The seed script creates these development accounts:

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Cashier | `cashier` | `cashier123` |

> [!WARNING]
> These credentials are for local development and demonstrations only. Change both passwords immediately if you seed a shared or production database.

The seed also creates starter product categories, expense categories, sample products, opening stock movements, settings, and example expenses.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Generate Prisma Client and create a production build |
| `npm run start` | Start the compiled production server |
| `npm run lint` | Run ESLint across the project |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create or apply migrations in development |
| `npm run db:push` | Push the schema directly without creating a migration |
| `npm run db:seed` | Run the idempotent starter-data seed |
| `npm run db:studio` | Open Prisma Studio |

Use the following command to apply committed migrations in production:

```bash
npx prisma migrate deploy
```

Reserve `db:push` for local prototyping because it does not create migration history.

## Database Design

```mermaid
erDiagram
    User ||--o{ Sale : processes
    User ||--o{ Return : processes
    User ||--o{ Expense : creates
    User ||--o{ StockMovement : records
    Category o|--o{ Product : classifies
    Product o|--o{ SaleItem : appears_in
    Product o|--o{ ReturnItem : appears_in
    Product ||--o{ StockMovement : has
    Sale ||--|{ SaleItem : contains
    Sale ||--o| Payment : has
    Sale ||--o{ Return : receives
    Return ||--|{ ReturnItem : contains
    ExpenseCategory o|--o{ Expense : classifies
```

### Important Data-Integrity Decisions

- Monetary fields use fixed-precision database decimals.
- `SaleItem` stores product-name, barcode, buying-price, and selling-price snapshots.
- `ReturnItem` stores product, cost, and refund-value snapshots.
- A sale, its payment, stock deduction, and stock-movement records are saved in one Prisma transaction.
- A return, its stock restoration, and stock-movement records are also saved transactionally.
- Products with historical references are deactivated rather than permanently deleted.
- Frequently filtered fields have database indexes for product, sales, inventory, expense, and return queries.

## Core Business Workflows

### Sale Workflow

1. The cashier scans a barcode or searches for a product.
2. The application verifies that the product is active and in stock.
3. The cashier updates quantities, discounts, payment method, and paid amount.
4. Zod validates the checkout payload.
5. The server recalculates prices from database values.
6. Prisma saves the sale, sale items, payment, stock changes, and stock movements in one transaction.
7. The receipt can be printed or reprinted from the saved sale.

### Return Workflow

1. The cashier finds the original invoice.
2. The application calculates the remaining returnable quantity for each item.
3. The cashier selects quantities and enters an optional reason.
4. Prisma saves the return and restores stock in one transaction.
5. Historical snapshot values determine the refund amount.

### Stock-Adjustment Workflow

1. An Admin selects a product.
2. A positive or negative adjustment and note are entered.
3. The service prevents stock from falling below zero.
4. The product quantity and audit-style movement record are saved together.

## Application Routes

### Pages

| Route | Access | Purpose |
| --- | --- | --- |
| `/login` | Public | Sign in |
| `/dashboard` | Admin, Cashier | Sales and operations overview |
| `/pos` | Admin, Cashier | Checkout and recent receipts |
| `/returns` | Admin, Cashier | Process and review returns |
| `/products` | Admin | Product catalog |
| `/inventory` | Admin | Stock levels and movements |
| `/expenses` | Admin | Expense management |
| `/reports` | Admin | Report filters and exports |
| `/users` | Admin | Account management |
| `/settings` | Admin | Shop and receipt configuration |

All application API routes require an authenticated session. Report export is restricted to Admin users.

## Receipt and Thermal-Printer Setup

Browser printing works without QZ Tray. Direct raw ESC/POS printing requires additional local setup:

1. Install and run QZ Tray 2.2.x on the cashier computer.
2. Connect the thermal printer and confirm its operating-system printer name.
3. Set `NEXT_PUBLIC_RECEIPT_PRINTER_NAME` if the printer is not named `POS-80`.
4. Create a QZ Tray certificate and its matching RSA private key.
5. Place the public certificate at:

   ```text
   public/digital-certificate.txt
   ```

6. Store the matching private key in `QZ_PRIVATE_KEY`. For a single-line environment value, represent PEM line breaks with literal `\n` sequences.
7. Restart the application and allow QZ Tray's connection prompt.

The public certificate and private key must be a matching pair. Never commit the private key.

The current `.gitignore` also excludes the public certificate, so ensure your deployment process supplies it if direct printing is required in production.

## Deployment

### Vercel and Neon

1. Create a PostgreSQL project in Neon.

2. Add these variables to the Vercel project:

   ```env
   DATABASE_URL="your-neon-postgresql-connection-string"
   AUTH_SECRET="your-random-secret-with-at-least-32-characters"
   APP_URL="https://your-production-domain"
   ```

3. Apply the committed database migrations:

   ```bash
   npx prisma migrate deploy
   ```

4. Use the standard build command:

   ```bash
   npm run build
   ```

   The build script already runs `prisma generate` before `next build`.

5. Deploy the application.

6. Run the seed command only if you intentionally want the starter records:

   ```bash
   npm run db:seed
   ```

If migrations are not handled by a separate release step, the Vercel Build Command can be:

```bash
npx prisma migrate deploy && npm run build
```

After changing `AUTH_SECRET`, existing session cookies become invalid and users must sign in again.

## Project Structure

```text
.
├── app/
│   ├── (auth)/                 # Login layout and page
│   ├── (dashboard)/            # Protected application pages
│   └── api/                    # Authenticated route handlers
├── components/
│   ├── dashboard/              # Charts and statistic cards
│   ├── forms/                  # Product, user, expense, stock, and settings forms
│   ├── layout/                 # Sidebar, top bar, and dashboard shell
│   ├── pos/                    # Interactive POS terminal
│   ├── receipt/                # Browser-printable receipt
│   ├── returns/                # Return-processing interface
│   └── ui/                     # Reusable UI primitives
├── lib/
│   ├── actions/                # Authorized server actions
│   ├── auth/                   # Session and permission helpers
│   ├── db/                     # Prisma Client singleton
│   ├── services/               # Business logic and database queries
│   ├── validations/            # Zod schemas and inferred input types
│   ├── constants.ts            # Navigation, roles, currencies, and report types
│   ├── env.ts                  # Runtime environment validation
│   ├── print-escpos.ts         # QZ Tray and ESC/POS integration
│   ├── types.ts                # Shared application contracts
│   └── utils.ts                # Formatting and identifier helpers
├── prisma/
│   ├── migrations/             # Versioned PostgreSQL migrations
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Starter data
├── public/                     # Static assets and receipt logo
├── proxy.ts                    # Authentication and role-aware route protection
└── package.json                # Dependencies and scripts
```

## Quality Checks

Run both checks before committing or deploying:

```bash
npm run lint
npm run build
```

The production build performs strict TypeScript checking.

No automated unit or end-to-end test command is currently configured, so linting and a successful production build are the current baseline checks.

## Security Notes

- Passwords are hashed with bcrypt using a cost factor of 12.
- Sessions use signed `HS256` JWTs stored in `HttpOnly` cookies.
- Session cookies use `SameSite=Lax` and `Secure` in production.
- Sessions expire after seven days.
- Protected paths are checked before page rendering.
- Sensitive server actions and API routes perform their own authorization.
- Inputs are validated with Zod before business logic runs.
- `AUTH_SECRET`, `DATABASE_URL`, and `QZ_PRIVATE_KEY` must never be committed.
- Seeded passwords must be changed before real-world use.
- Production databases should have automated backups and restricted credentials.

## Troubleshooting

### Prisma-Generated Types Are Missing

If TypeScript reports implicit `any` errors on Prisma query results or cannot resolve generated model types, regenerate Prisma Client:

```bash
npm run db:generate
npm run build
```

Also confirm that `@prisma/client` and `prisma` use compatible versions and that `DATABASE_URL` exists while generation runs.

### `ReportData` or `DashboardData` Is Not Exported

Confirm the shared contracts are exported from `lib/types.ts`, because the `@/lib/types` alias resolves to that file:

```bash
rg "export type (ReportData|DashboardData)" lib/types.ts
```

### Environment Validation Fails

Check that:

- `DATABASE_URL` is not empty.
- `AUTH_SECRET` contains at least 32 characters.
- `APP_URL` is a complete URL, including `http://` or `https://`.

### Database Tables Are Missing

For local development:

```bash
npm run db:migrate
```

For production:

```bash
npx prisma migrate deploy
```

### QZ Tray Cannot Print

- Confirm QZ Tray is open on the cashier computer.
- Confirm the configured printer name matches the operating-system printer name.
- Confirm `public/digital-certificate.txt` is available.
- Confirm `QZ_PRIVATE_KEY` matches that certificate.
- Confirm the QZ Tray script is reachable.
- Use the browser-print fallback while diagnosing the direct-print connection.

## Roadmap

- Automated unit, integration, and end-to-end tests
- Persisted held carts across sessions and devices
- Product image upload and optimization
- CSV product import and export
- Advanced audit and activity logs
- More detailed tax and discount configuration
- Supplier and purchase-order management
- Multi-branch inventory
- Offline-tolerant cashier workflow
- Additional dashboard and forecasting reports
- Optional responsive tablet and mobile interface

## Contributing

1. Create a focused feature branch.
2. Keep business logic in `lib/services`.
3. Validate external inputs with a schema in `lib/validations`.
4. Preserve transaction boundaries for sales, returns, and stock changes.
5. Run the quality checks:

   ```bash
   npm run lint
   npm run build
   ```

6. Open a pull request with a clear description and verification notes.

---

<div>
  Designed for seamless, efficient and modern cosmetics retail management.
</div>
