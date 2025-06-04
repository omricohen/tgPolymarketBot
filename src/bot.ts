// Main Telegram Bot setup and command registration
import 'dotenv/config';

const TelegramBot = require('node-telegram-bot-api');
import { handleStart } from './handlers/start-handler';
import { handleCreateWallet, handleBalance } from './handlers/wallet-handler';
import { handleSendHbar } from './handlers/transfer-handler';
import { handleHelp } from './handlers/help-handler';
import { handleSearchMarkets } from './handlers/polymarket-handler';

const token: string = process.env.TELEGRAM_BOT_TOKEN!;
const bot = new TelegramBot(token, { 
    polling: true,
    request: {
        timeout: 30000, // 30 seconds timeout for API requests
        connect_timeout: 10000 // 10 seconds timeout for connection
    }
}); 

console.log('Bot started...');

// Register command handlers (keeping these as fallback)
bot.onText(/\/start/, (msg: any) => handleStart(bot, msg));
bot.onText(/\/help/, (msg: any) => handleHelp(bot, msg));
bot.onText(/\/create_wallet/, (msg: any) => handleCreateWallet(bot, msg));
bot.onText(/\/balance/, (msg: any) => handleBalance(bot, msg));
bot.onText(/\/send_hbar (.+) (.+)/, (msg: any, match: RegExpMatchArray) => handleSendHbar(bot, msg, match));
bot.onText(/\/search_markets (.+)/, (msg: any, match: RegExpMatchArray) => handleSearchMarkets(bot, msg, match));
// bot.onText(/\/market_details (.+)/, (msg: any, match: RegExpMatchArray) => handleMarketDetails(bot, msg, match));

// Handle callback queries from inline keyboard buttons
bot.on('callback_query', async (callbackQuery: any) => {
    const msg = callbackQuery.message;
    const action = callbackQuery.data;

    try {
        // Immediately answer the callback query to prevent timeout
        await bot.answerCallbackQuery(callbackQuery.id);

        // Then process the action
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
                await bot.sendMessage(msg.chat.id, 
                    "To send HBAR, please use the command format:\n" +
                    "`/send_hbar <recipient> <amount>`\n\n" +
                    "Example:\n" +
                    "`/send_hbar 0.0.123456 5`", 
                    { parse_mode: 'Markdown' }
                );
                break;
            case 'search_markets':
                await bot.sendMessage(msg.chat.id,
                    "To search Polymarket markets, use the command:\n" +
                    "`/search_markets <search term>`\n\n" +
                    "Example:\n" +
                    "`/search_markets bitcoin`",
                    { parse_mode: 'Markdown' }
                );
                break;
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
        // Try to notify the user if something went wrong
        try {
            await bot.sendMessage(msg.chat.id, 
                "Sorry, there was an error processing your request. Please try again."
            );
        } catch (sendError) {
            console.error('Error sending error message:', sendError);
        }
    }
});

// Export for potential webhook usage
export { bot };