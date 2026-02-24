const prisma = require('./utils/prisma');
async function test() {
    try {
        console.log('Connecting to db...');
        const result = Promise.race([
            prisma.user.findFirst(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
        ]);
        const u = await result;
        console.log('Success!', u);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}
test();
