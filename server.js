const app = require('./app');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const port = process.env.PORT || 5000;

const server = http.createServer(app);

// Graceful shutdown
const shutdown = () => {
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
