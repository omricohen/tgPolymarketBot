// /help command handler
const TelegramBot = require('node-telegram-bot-api');

async function handleHelp(bot: any, msg: any): Promise<void> {
    const helpMessage = `🤖 Hedera Polymarket Bot Commands

📋 Available Commands:

🚀 Use /start - Welcome message and introduction
❓ Use /help - Show this help message
💳 Use /create_wallet to create a new Hedera wallet
💰 Use /balance to check your wallet balance
💸 Use /send_hbar <recipient> <amount> to send HBAR to another account

📖 Examples:
• \`/create_wallet\` - Creates your personal Hedera wallet
• \`/balance\` - Shows your current HBAR and token balances
• \`/send_hbar 0.0.123456 5\` - Sends 5 HBAR to account 0.0.123456

💡 Tips:
• Your wallet is automatically funded with 10 HBAR when created
• You can send HBAR to both Account IDs (0.0.xxxxx) and EVM addresses
• All transactions are on Hedera Testnet for development

🔗 Need Help?
Visit [Hedera Documentation](https://docs.hedera.com) for more information.`;

    await bot.sendMessage(msg.chat.id, helpMessage, {
        disable_web_page_preview: true
    });
}

export { handleHelp };