// Main entry point for the Telegram Bot application
import 'dotenv/config';
import { logInfo, logError } from './services/logger-service';
import { bot } from './bot';
import { prisma } from './config/database';

// Start the bot
async function startBot() {
    try {
        logInfo('Starting bot...');
        
        // Ensure database connection
        await prisma.$connect();
        logInfo('Database connected');

        // Start bot polling
        bot.startPolling();
        logInfo('Bot polling started');

        // Send ready signal to PM2
        if (process.send) {
            process.send('ready');
            logInfo('PM2 ready signal sent');
        }
    } catch (error) {
        logError(error as Error, 'Error starting bot');
        process.exit(1);
    }
}

// Handle graceful shutdown
async function shutdown() {
    logInfo('Received shutdown signal, starting graceful shutdown...');
    
    try {
        // Stop the bot
        await bot.stopPolling();
        logInfo('Bot polling stopped');

        // Close database connections
        await prisma.$disconnect();
        logInfo('Database connections closed');

        // Log successful shutdown
        logInfo('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logError(error as Error, 'Error during shutdown');
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logError(error, 'Uncaught Exception');
    shutdown().catch(() => process.exit(1));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logError(reason as Error, 'Unhandled Rejection', { promise });
    shutdown().catch(() => process.exit(1));
});

// Handle graceful shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the bot
startBot().catch((error) => {
    logError(error as Error, 'Failed to start bot');
    process.exit(1);
});

// For Vercel webhook deployment, uncomment and modify the following:
/*
import express from 'express';
import bodyParser from 'body-parser';
import { bot } from './bot';

const app = express();
app.use(bodyParser.json());

app.post(`/api/webhook`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

const port: number = parseInt(process.env.PORT || '3000');
app.listen(port, () => console.log(`Server running on port ${port}`));

export default app; // For Vercel Serverless Function that exports an Express app
*/

// Note: You'd also need to run `npx prisma migrate deploy` in your Vercel build step or locally.