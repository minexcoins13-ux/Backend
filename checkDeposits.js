const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const pendingDeposits = await prisma.deposit.findMany({
        where: { status: 'PENDING' },
        include: { user: true }
    });
    console.log('Pending Deposits:', JSON.stringify(pendingDeposits, null, 2));

    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' }
    });
    console.log('Admins:', JSON.stringify(admins.map(u => ({ email: u.email, role: u.role })), null, 2));
}

main()
    .catch((e) => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
