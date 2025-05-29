// /start command handler
const TelegramBot = require('node-telegram-bot-api');

async function handleStart(bot: any, msg: any): Promise<void> {
    const welcomeMessage = `🎉 Welcome to the Hedera Polymarket Bot!

I can help you manage your Hedera wallet for Polymarket bets and DeFi activities.

🚀 Quick Start:
1. Use /create_wallet to create your Hedera wallet
2. Use /balance to check your wallet balance
3. Use /help to see all available commands

Let's get started! 🚀`;

    await bot.sendMessage(msg.chat.id, welcomeMessage);
}

export { handleStart };