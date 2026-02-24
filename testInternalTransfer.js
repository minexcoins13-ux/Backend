const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testInternalTransfers() {
    try {
        console.log('--- Registering User A ---');
        const userA = await axios.post(`${API_URL}/auth/register`, {
            name: 'User A',
            email: `usera_${Date.now()}@test.com`,
            password: 'password123'
        });
        const tokenA = userA.data.data.token;
        console.log('User A registered. Token:', tokenA.substring(0, 10) + '...');

        console.log('--- Registering User B ---');
        const userB = await axios.post(`${API_URL}/auth/register`, {
            name: 'User B',
            email: `userb_${Date.now()}@test.com`,
            password: 'password123'
        });
        const tokenB = userB.data.data.token;
        console.log('User B registered. Token:', tokenB.substring(0, 10) + '...');

        console.log('--- Fetching User B Wallets to get USDT address ---');
        const walletsB = await axios.get(`${API_URL}/wallet`, { headers: { Authorization: `Bearer ${tokenB}` } });
        const bncUsdtWallet = walletsB.data.data.find(w => w.currency === 'USDT');
        console.log('User B USDT Address:', bncUsdtWallet.address);

        // We can't easily artificially fund User A via API without admin approval, so we'll mock it via prisma directly in a separate script or just assume admin approval.
        // Wait, for this test, we can just manipulate the DB directly using prisma.
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        console.log('--- Artificially Funding User A with 1000 USDT ---');
        const walletA = await prisma.wallet.findFirst({ where: { user_id: userA.data.data.id, currency: 'USDT' } });
        await prisma.wallet.update({ where: { id: walletA.id }, data: { balance: 1000 } });
        console.log('User A funded.');

        console.log('--- User A Sends 100 USDT to User B internally ---');
        const sendRes = await axios.post(`${API_URL}/wallet/withdraw`, {
            currency: 'USDT',
            amount: 100,
            address: bncUsdtWallet.address
        }, { headers: { Authorization: `Bearer ${tokenA}` } });
        console.log('Send Transfer Result:', sendRes.data.message);

        console.log('--- Checking Balances ---');
        const updatedWalletsA = await axios.get(`${API_URL}/wallet`, { headers: { Authorization: `Bearer ${tokenA}` } });
        const updatedWalletsB = await axios.get(`${API_URL}/wallet`, { headers: { Authorization: `Bearer ${tokenB}` } });

        console.log('User A USDT Balance:', updatedWalletsA.data.data.find(w => w.currency === 'USDT').balance);
        console.log('User B USDT Balance:', updatedWalletsB.data.data.find(w => w.currency === 'USDT').balance);

        console.log('--- Test Complete ---');
        process.exit(0);

    } catch (err) {
        console.error('Test failed:', err.response?.data || err.message);
        process.exit(1);
    }
}

testInternalTransfers();
