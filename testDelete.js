const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const prisma = new PrismaClient();

const API_URL = 'http://localhost:5000/api';

async function main() {
    // 1. Get Admin User
    const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (!adminUser) {
        console.error('No admin user found!');
        return;
    }

    // 2. Generate Token
    const token = jwt.sign({ id: adminUser.id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
    console.log('Generated Admin Token');

    // 3. Create a Dummy Pending Deposit
    const deposit = await prisma.deposit.create({
        data: {
            user_id: adminUser.id,
            amount: 50,
            currency: 'USDT',
            txid: 'DELETE_TEST_' + Date.now(),
            status: 'PENDING'
        }
    });
    console.log('Created Dummy Deposit:', deposit.id);

    // 4. Call Delete API
    try {
        console.log('Calling Delete API...');
        const res = await axios.delete(
            `${API_URL}/admin/deposit/${deposit.id}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        console.log('API Response:', res.data);

        // 5. Verify Deletion
        const check = await prisma.deposit.findUnique({
            where: { id: deposit.id }
        });

        if (!check) {
            console.log('Verification: Deposit successfully removed from DB');
        } else {
            console.error('Verification Failed: Deposit still exists');
        }

    } catch (error) {
        console.error('API Failed:', error.response ? error.response.data : error.message);
    }
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
