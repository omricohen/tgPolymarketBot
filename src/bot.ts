// Main Telegram Bot setup and command registration
import 'dotenv/config';

const TelegramBot = require('node-telegram-bot-api');
import { handleStart } from './handlers/start-handler';
import { handleCreateWallet, handleBalance } from './handlers/wallet-handler';
import { handleSendHbar } from './handlers/transfer-handler';
import { handleHelp } from './handlers/help-handler';

const token: string = process.env.TELEGRAM_BOT_TOKEN!;
const bot = new TelegramBot(token, { polling: true }); // Polling for simplicity. Use webhooks for Vercel production.

console.log('Bot started...');

// Register command handlers (keeping these as fallback)
bot.onText(/\/start/, (msg: any) => handleStart(bot, msg));
bot.onText(/\/help/, (msg: any) => handleHelp(bot, msg));
bot.onText(/\/create_wallet/, (msg: any) => handleCreateWallet(bot, msg));
bot.onText(/\/balance/, (msg: any) => handleBalance(bot, msg));
bot.onText(/\/send_hbar (.+) (.+)/, (msg: any, match: RegExpMatchArray) => handleSendHbar(bot, msg, match));

// Handle callback queries from inline keyboard buttons
bot.on('callback_query', async (callbackQuery: any) => {
    const msg = callbackQuery.message;
    const action = callbackQuery.data;

    // Acknowledge the button click
    await bot.answerCallbackQuery(callbackQuery.id);

    switch (action) {
        case 'start':
            await handleStart(bot, msg);
            break;
        case 'create_wallet':
            await handleCreateWallet(bot, msg);
            break;
        case 'balance':
            await handleBalance(bot, msg);
            break;
        case 'help':
            await handleHelp(bot, msg);
            break;
        case 'send_hbar':
            // For send_hbar, we need to prompt for recipient and amount
            await bot.sendMessage(msg.chat.id, 
                "To send HBAR, please use the command format:\n" +
                "`/send_hbar <recipient> <amount>`\n\n" +
                "Example:\n" +
                "`/send_hbar 0.0.123456 5`", 
                { parse_mode: 'Markdown' }
            );
            break;
    }
});

// Export for potential webhook usage
export { bot };