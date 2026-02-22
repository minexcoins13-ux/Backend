const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Get a pending deposit
    const deposit = await prisma.deposit.findFirst({
        where: { status: 'PENDING' },
        include: { user: true }
    });

    if (!deposit) {
        console.log('No pending deposits found.');
        return;
    }

    console.log('Found pending deposit:', deposit.id);

    try {
        await prisma.$transaction(async (prisma) => {
            // Update Deposit Status
            console.log('Updating deposit status...');
            await prisma.deposit.update({
                where: { id: deposit.id },
                data: { status: 'ACTIVE' }
            });

            // Add Balance
            console.log('Adding balance to wallet...');
            const wallet = await prisma.wallet.findUnique({
                where: {
                    user_id_currency: {
                        user_id: deposit.user_id,
                        currency: deposit.currency
                    }
                }
            });

            if (wallet) {
                console.log('Wallet found, updating balance...');
                await prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: deposit.amount } }
                });
            } else {
                console.log('Wallet not found, creating new wallet...');
                await prisma.wallet.create({
                    data: {
                        user_id: deposit.user_id,
                        currency: deposit.currency,
                        balance: deposit.amount
                    }
                });
            }

            // Transaction Ledger
            console.log('Creating ledger entry...');
            await prisma.transactionLedger.create({
                data: {
                    user_id: deposit.user_id,
                    type: 'DEPOSIT',
                    currency: deposit.currency,
                    amount: deposit.amount,
                    reference_id: deposit.id
                }
            });

            console.log('Transaction completed successfully!');
        });
    } catch (error) {
        console.error('Transaction failed:', error);
    }
}

main()
    .catch((e) => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
