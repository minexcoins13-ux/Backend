const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const email = process.argv[2];

if (!email) {
    console.log('Please provide an email address.');
    console.log('Usage: node promoteToAdmin.js <email>');
    process.exit(1);
}

async function main() {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.log(`User with email ${email} not found.`);
        return;
    }

    const updatedUser = await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
    });

    console.log(`User ${updatedUser.email} has been promoted to ADMIN.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
