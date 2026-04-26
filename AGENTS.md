<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## POS Project Rules

- Stack: Next.js, TypeScript, Tailwind, shadcn/ui, PostgreSQL, Prisma
- Keep architecture simple and production-safe
- Desktop-first cashier UI, mobile-friendly admin pages
- Use transactions for sale completion and stock updates
- Do not print receipt before successful sale save
- Save product name and price snapshots in sale items
- Barcode must be unique
- Prefer reusable components and strong typing
- Do not add customer, supplier, loyalty, or purchase modules in v1
- Always keep admin and cashier permissions separate
