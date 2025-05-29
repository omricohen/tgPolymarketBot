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

// Register command handlers
bot.onText(/\/start/, (msg: any) => handleStart(bot, msg));
bot.onText(/\/help/, (msg: any) => handleHelp(bot, msg));
bot.onText(/\/create_wallet/, (msg: any) => handleCreateWallet(bot, msg));
bot.onText(/\/balance/, (msg: any) => handleBalance(bot, msg));
bot.onText(/\/send_hbar (.+) (.+)/, (msg: any, match: RegExpMatchArray) => handleSendHbar(bot, msg, match));

// Export for potential webhook usage
export { bot };