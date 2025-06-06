// Main Telegram Bot setup and command registration
import 'dotenv/config';
import { logInfo, logError, logWarning, logTelegramRequest } from './services/logger-service';
import { Client } from '@hashgraph/sdk';

const TelegramBot = require('node-telegram-bot-api');
import { handleStart } from './handlers/start-handler';
import { handleCreateWallet, handleBalance, handleWalletInfo } from './handlers/wallet-handler';
import { handleSendHbar } from './handlers/transfer-handler';
import { handleHelp } from './handlers/help-handler';
import { handleSearchMarkets, handleMarketDetails } from './handlers/polymarket-handler';
import { PolymarketService } from './services/polymarket-service';

// Define types for temporary transfer data
interface TempTransferData {
    recipient: string;
    chatId: number;
}

// Declare global temporary storage
declare global {
    var tempTransferData: TempTransferData | undefined;
}

// Validate required environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN', 'HEDERA_OPERATOR_ID', 'HEDERA_OPERATOR_PRIVATE_KEY'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        logError(new Error(`Missing required environment variable: ${envVar}`), 'Environment validation');
        process.exit(1);
    }
}

// Initialize bot with polling
export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: {
        autoStart: false,
        interval: 300,
        params: {
            timeout: 10
        }
    }
});

// Handle polling errors
bot.on('polling_error', (error: Error) => {
    logError(error, 'Telegram polling error');
});

// Handle general bot errors
bot.on('error', (error: Error) => {
    logError(error, 'Telegram bot error');
});

// Set up bot commands
const commands = [
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Show help information' },
    { command: 'create_wallet', description: 'Create a new Hedera wallet' },
    { command: 'wallet_info', description: 'View your wallet details' },
    { command: 'balance', description: 'Check your wallet balance' },
    { command: 'send_hbar', description: 'Send HBAR to another wallet' },
    { command: 'search_markets', description: 'Search Polymarket markets' }
];

bot.setMyCommands(commands)
    .then(() => logInfo('Bot commands set successfully'))
    .catch((error: Error) => logError(error, 'Setting bot commands'));

// Log bot startup
logInfo('Bot starting...', {
    polling: true,
    commands: commands.map(cmd => cmd.command)
});

// Handle /start command
bot.onText(/\/start/, async (msg: any) => {
    logTelegramRequest(msg, 'start');
    await handleStart(bot, msg);
});

// Handle /help command
bot.onText(/\/help/, async (msg: any) => {
    logTelegramRequest(msg, 'help');
    await handleHelp(bot, msg);
});

// Handle /create_wallet command
bot.onText(/\/create_wallet/, async (msg: any) => {
    logTelegramRequest(msg, 'create_wallet');
    await handleCreateWallet(bot, msg);
});

// Handle /wallet_info command
bot.onText(/\/wallet_info/, async (msg: any) => {
    logTelegramRequest(msg, 'wallet_info');
    await handleWalletInfo(bot, msg);
});

// Handle /balance command
bot.onText(/\/balance/, async (msg: any) => {
    logTelegramRequest(msg, 'balance');
    await handleBalance(bot, msg);
});

// Handle /send_hbar command and follow-up
bot.onText(/\/send_hbar/, async (msg: any) => {
    logTelegramRequest(msg, 'send_hbar');
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 
        "Please provide the recipient's address.\nFormat: 0.0.XXXXX",
        { reply_markup: { force_reply: true, selective: true } }
    );
});

// Handle recipient address for send_hbar
bot.onText(/^0\.0\.\d+$/, async (msg: any) => {
    if (!global.tempTransferData || global.tempTransferData.chatId !== msg.chat.id) {
        const chatId = msg.chat.id;
        global.tempTransferData = { recipient: msg.text, chatId };
        await bot.sendMessage(chatId, 
            "How many HBAR would you like to send?",
            { reply_markup: { force_reply: true, selective: true } }
        );
    }
});

// Handle amount input for send_hbar
bot.onText(/^[0-9]+(\.[0-9]+)?$/, async (msg: any) => {
    if (global.tempTransferData && global.tempTransferData.chatId === msg.chat.id) {
        logTelegramRequest(msg, 'send_hbar');
        const match = ['dummy', global.tempTransferData.recipient, msg.text] as RegExpMatchArray;
        await handleSendHbar(bot, msg, match);
        global.tempTransferData = undefined;
    }
});

// Handle /search_markets command
bot.onText(/\/search_markets(?:\s+(.+))?/, async (msg: any, match: RegExpMatchArray | null) => {
    logTelegramRequest(msg, 'search_markets');
    
    // If search term is provided with command, search immediately
    if (match && match[1]) {
        await handleSearchMarkets(bot, msg, match);
    } else {
        // Otherwise, ask for search term
        await bot.sendMessage(msg.chat.id, 
            "What markets would you like to search for?",
            { reply_markup: { force_reply: true, selective: true } }
        );
    }
});

// Handle market search input
bot.onText(/^(?!\/)\w+.*/, async (msg: any) => {
    try {
        // Check if this is a reply to our search markets question
        if (msg.reply_to_message && 
            msg.reply_to_message.from.id === parseInt(process.env.TELEGRAM_BOT_ID!) && 
            msg.reply_to_message.text === "What markets would you like to search for?") {
            
            logTelegramRequest(msg, 'search_markets');
            // Construct match array similar to command regex match
            const match = [msg.text, msg.text] as unknown as RegExpMatchArray;
            await handleSearchMarkets(bot, msg, match);
        }
    } catch (error) {
        logError(error as Error, 'Error handling market search input');
    }
});

// Handle all other messages
bot.on('message', async (msg: any) => {
    try {
        // Log all messages for monitoring
        logTelegramRequest(msg);

    } catch (error) {
        // Handle any errors in message processing
        const errorMessage = 'Sorry, there was an error processing your message. Please try again.';
        try {
            await bot.sendMessage(msg.chat.id, errorMessage);
        } catch (sendError) {
            logError(sendError as Error, 'Error sending error message', { msg });
        }
        logError(error as Error, 'Message handler error', { msg });
    }
});

// Handle callback queries (button clicks)
bot.on('callback_query', async (callbackQuery: any) => {
    try {
        const msg = callbackQuery.message;
        logTelegramRequest(callbackQuery.message, `callback_query: ${callbackQuery.data}`);

        // Parse the callback data
        const [action, ...params] = callbackQuery.data.split(':');

        // Handle different callback actions
        switch (action) {
            case 'start':
                await handleStart(bot, msg);
                break;

            case 'help':
                await handleHelp(bot, msg);
                break;

            case 'create_wallet':
                await handleCreateWallet(bot, msg);
                break;

            case 'wallet_info':
                await handleWalletInfo(bot, msg);
                break;

            case 'balance':
                await handleBalance(bot, msg);
                break;

            case 'copy':
                const [type, value] = params;
                // Answer callback query with a notification
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: `${type === 'account' ? 'Account ID' : 'EVM Address'} copied to clipboard!`
                });
                // Send the value as a separate message for easy copying
                await bot.sendMessage(msg.chat.id, 
                    `Here's your ${type === 'account' ? 'Account ID' : 'EVM Address'} for easy copying:\n\n` +
                    `\`${value}\``, 
                    { parse_mode: 'Markdown' }
                );
                break;

            case 'send_hbar':
                await bot.sendMessage(msg.chat.id, 
                    "Please provide the recipient's address.\nFormat: 0.0.XXXXX",
                    { reply_markup: { force_reply: true, selective: true } }
                );
                break;

            case 'search_markets':
                await bot.sendMessage(msg.chat.id, 
                    "What markets would you like to search for?",
                    { reply_markup: { force_reply: true, selective: true } }
                );
                break;

            case 'market_details':
                if (params.length > 0) {
                    const marketId = params[0];
                    await handleMarketDetails(bot, msg, marketId);
                }
                break;

            default:
                logWarning(`Unknown callback query action: ${action}`, { msg });
                break;
        }
    } catch (error) {
        logError(error as Error, 'Error handling callback query', { callbackQuery });
        try {
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: 'Sorry, there was an error processing your request.'
            });
        } catch (sendError) {
            logError(sendError as Error, 'Error sending callback query error message', { callbackQuery });
        }
    }
});