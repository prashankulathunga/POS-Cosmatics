import { PrismaClient, UserRole, StockMovementType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;

if (!connectionString) {
    throw new Error('DATABASE_URL not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function buildBarcode(seed: number) {
    return `8901000${seed.toString().padStart(5, '0')}`;
}

async function main() {
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const cashierPasswordHash = await bcrypt.hash('cashier123', 12);

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            fullName: 'Store Admin',
            passwordHash: adminPasswordHash,
            role: UserRole.ADMIN,
            isActive: true,
        },
        create: {
            username: 'admin',
            email: 'admin@posbeauty.local',
            fullName: 'Store Admin',
            passwordHash: adminPasswordHash,
            role: UserRole.ADMIN,
        },
    });

    const cashier = await prisma.user.upsert({
        where: { username: 'cashier' },
        update: {
            fullName: 'Main Cashier',
            passwordHash: cashierPasswordHash,
            role: UserRole.CASHIER,
            isActive: true,
        },
        create: {
            username: 'cashier',
            email: 'cashier@posbeauty.local',
            fullName: 'Main Cashier',
            passwordHash: cashierPasswordHash,
            role: UserRole.CASHIER,
        },
    });

    const categories = await Promise.all(
        ['Hair Care', 'Skin Care', 'Makeup', 'Accessories'].map((name) =>
            prisma.category.upsert({
                where: { name },
                update: {},
                create: { name },
            }),
        ),
    );

    const expenseCategories = await Promise.all(
        ['Rent', 'Utilities', 'Transport', 'Office Supplies'].map((name) =>
            prisma.expenseCategory.upsert({
                where: { name },
                update: {},
                create: { name },
            }),
        ),
    );

    const sampleProducts = [
        {
            name: 'Argan Repair Shampoo',
            categoryId: categories[0].id,
            buyingPrice: '8.50',
            sellingPrice: '14.99',
            stockQuantity: 28,
            lowStockLimit: 6,
        },
        {
            name: 'Vitamin C Face Serum',
            categoryId: categories[1].id,
            buyingPrice: '6.20',
            sellingPrice: '12.50',
            stockQuantity: 18,
            lowStockLimit: 5,
        },
        {
            name: 'Velvet Matte Lipstick',
            categoryId: categories[2].id,
            buyingPrice: '3.80',
            sellingPrice: '9.99',
            stockQuantity: 42,
            lowStockLimit: 8,
        },
        {
            name: 'Silk Hair Brush',
            categoryId: categories[3].id,
            buyingPrice: '4.10',
            sellingPrice: '11.75',
            stockQuantity: 10,
            lowStockLimit: 4,
        },
        {
            name: 'Hydrating Body Lotion',
            categoryId: categories[1].id,
            buyingPrice: '5.00',
            sellingPrice: '10.99',
            stockQuantity: 8,
            lowStockLimit: 5,
        },
    ];

    for (const [index, product] of sampleProducts.entries()) {
        const barcode = buildBarcode(index + 1);

        const savedProduct = await prisma.product.upsert({
            where: { barcode },
            update: {
                ...product,
                barcode,
                internalCode: `P-${(index + 1).toString().padStart(4, '0')}`,
            },
            create: {
                ...product,
                barcode,
                internalCode: `P-${(index + 1).toString().padStart(4, '0')}`,
            },
        });

        const existingInitialMovement = await prisma.stockMovement.findFirst({
            where: {
                productId: savedProduct.id,
                type: StockMovementType.INITIAL,
            },
        });

        if (!existingInitialMovement) {
            await prisma.stockMovement.create({
                data: {
                    productId: savedProduct.id,
                    type: StockMovementType.INITIAL,
                    quantityChange: savedProduct.stockQuantity,
                    stockBefore: 0,
                    stockAfter: savedProduct.stockQuantity,
                    note: 'Seed opening stock',
                    createdById: admin.id,
                },
            });
        }
    }

    await prisma.settings.upsert({
        where: { id: 'main-settings' },
        update: {
            shopName: 'BLISSORA',
            address: '123 Main Street, Retail City',
            phone: '+1 555-0100',
            receiptHeader: 'Thank you for shopping with us',
            receiptFooter: 'Returns accepted with invoice within 7 days',
            currencyCode: 'LKR',
            currencySymbol: 'Rs.',
            receiptCopies: 1,
        },
        create: {
            id: 'main-settings',
            shopName: 'BLISSORA',
            address: '123 Main Street, Retail City',
            phone: '+1 555-0100',
            receiptHeader: 'Thank you for shopping with us',
            receiptFooter: 'Returns accepted with invoice within 7 days',
            currencyCode: 'LKR',
            currencySymbol: 'Rs.',
            receiptCopies: 1,
        },
    });

    const expenseCount = await prisma.expense.count();

    if (expenseCount === 0) {
        await prisma.expense.createMany({
            data: [
                {
                    title: 'Weekly rent contribution',
                    amount: '120.00',
                    expenseDate: new Date(),
                    categoryId: expenseCategories[0].id,
                    createdById: admin.id,
                },
                {
                    title: 'Power and internet',
                    amount: '45.50',
                    expenseDate: new Date(),
                    categoryId: expenseCategories[1].id,
                    createdById: admin.id,
                },
            ],
        });
    }

    console.log('Seed complete');
    console.log('Admin login: admin / admin123');
    console.log('Cashier login: cashier / cashier123');
    console.log(`Seeded users: ${admin.fullName}, ${cashier.fullName}`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
