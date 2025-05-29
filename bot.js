require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { PrismaClient } = require('@prisma/client');
const { hederaService } = require('./hederaService'); // Import Hedera service

// Validate required environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is required');
    process.exit(1);
}

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true }); // Or { webhook: { port: 8443 } } for production

// Initialize Prisma Client (singleton pattern for serverless environments) [5]
let prisma;
if (!global.prisma) {
  global.prisma = new PrismaClient();
}
prisma = global.prisma;

// Basic /start command handler
bot.onText(/\/start/, async (msg) => {
    try {
        await bot.sendMessage(msg.chat.id, "Welcome! I can help you manage your Hedera wallet for Polymarket bets. Use /create_wallet to get started.");
    } catch (error) {
        console.error("Error in /start command:", error);
    }
});

// /create_wallet command handler
bot.onText(/\/create_wallet/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        let user = await prisma.user.findUnique({ where: { telegramId: String(chatId) } });
        if (!user) {
            user = await prisma.user.create({ data: { telegramId: String(chatId) } });
        }

        if (user.wallet) {
            await bot.sendMessage(chatId, "You already have a Hedera wallet associated with this account. Your EVM address is: `" + user.wallet.hederaEvmAddress + "`", { parse_mode: "Markdown" });
            return;
        }

        await bot.sendMessage(chatId, "Setting up your secure Hedera wallet...");
        const { newAccountId, evmAddress, newPublicKey } = await hederaService.createHederaAccount(String(chatId));

        await prisma.wallet.create({
            data: {
                userId: user.id,
                hederaAccountId: newAccountId,
                hederaEvmAddress: evmAddress,
                publicKey: newPublicKey.toString(),
                // encryptedPrivateKey: encryptedKey, // Only if custodial and not using MPC
            },
        });

        await bot.sendMessage(chatId, `Your Hedera wallet has been created! Your EVM address for funding is: \`${evmAddress}\`. You can send HBAR or USDC to this address.`, { parse_mode: "Markdown" });
    } catch (error) {
        console.error("Error creating wallet:", error);
        await bot.sendMessage(chatId, "Failed to create wallet. Please try again later.");
    }
});

// /balance command handler
bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const user = await prisma.user.findUnique({
            where: { telegramId: String(chatId) },
            include: { wallet: true },
        });

        if (!user ||!user.wallet ||!user.wallet.hederaAccountId) {
            await bot.sendMessage(chatId, "You don't have a Hedera wallet yet. Use /create_wallet to create one.");
            return;
        }

        const balance = await hederaService.getAccountBalance(user.wallet.hederaAccountId);
        let balanceMessage = `Your Hedera Account ID: \`${user.wallet.hederaAccountId}\`\n`;
        balanceMessage += `HBAR Balance: \`${balance.hbar}\`\n`;
        if (balance.tokens) {
            for (const [tokenId, amount] of Object.entries(balance.tokens)) {
                balanceMessage += `Token ${tokenId}: \`${amount}\`\n`;
            }
        }
        await bot.sendMessage(chatId, balanceMessage, { parse_mode: "Markdown" });

    } catch (error) {
        console.error("Error fetching balance:", error);
        await bot.sendMessage(chatId, "Failed to retrieve balance. Please try again later.");
    }
});

// If using webhooks for Vercel deployment:
// const app = express();
// app.use(express.json());
// app.post(`/bot${token}`, (req, res) => {
//   bot.processUpdate(req.body);
//   res.sendStatus(200);
// });
// app.listen(process.env.PORT | | 3000, () => {
//   console.log('Telegram bot webhook listening');
// });
// bot.setWebHook(process.env.WEBHOOK_URL + /bot${token});