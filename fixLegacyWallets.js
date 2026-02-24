const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const generateWalletAddress = (currency) => {
    const randomHex = crypto.randomBytes(20).toString('hex');
    switch (currency) {
        case 'BTC': return `1${randomHex}`; // Simple mock BTC
        case 'ETH':
        case 'USDT':
        case 'BNB': return `0x${randomHex}`; // Mock EVM
        case 'TRX': return `T${randomHex}`; // Mock Tron
        default: return randomHex;
    }
};

async function assignAddressesToLegacyWallets() {
    try {
        console.log('Finding wallets without an address (or matching default length)...');

        // Find all wallets
        const allWallets = await prisma.wallet.findMany();
        let updatedCount = 0;

        for (const wallet of allWallets) {
            // Prisma default uuid() is 36 chars. If it's exactly 36 chars and has hyphens, it's a default UUID we need to overwrite with a real crypto address mock.
            // Or if address is somehow null/empty.
            if (!wallet.address || (wallet.address.length === 36 && wallet.address.includes('-'))) {
                const newAddress = generateWalletAddress(wallet.currency);

                await prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { address: newAddress }
                });
                console.log(`Updated wallet ${wallet.id} (${wallet.currency}) with address: ${newAddress}`);
                updatedCount++;
            }
        }

        console.log(`\nMigration Complete. Updated ${updatedCount} legacy wallets.`);
    } catch (error) {
        console.error('Error migrating wallets:', error);
    } finally {
        await prisma.$disconnect();
    }
}

assignAddressesToLegacyWallets();
