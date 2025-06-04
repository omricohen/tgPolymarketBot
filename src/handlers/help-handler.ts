// /help command handler
const TelegramBot = require('node-telegram-bot-api');

async function handleHelp(bot: any, msg: any): Promise<void> {
    const helpMessage = `🤖 Hedera Polymarket Bot Help

I can help you manage your Hedera wallet for Polymarket Predictions and DeFi activities.

📋 Available Actions:

💳 Create Wallet - Create a new Hedera wallet
💰 Check Balance - View your wallet balance
💸 Send HBAR - Transfer HBAR to another account

💡 Tips:
• Your wallet is automatically funded with 10 tinybars when created
• You can send HBAR to both Account IDs (0.0.xxxxx) and EVM addresses
• All transactions are on Hedera Testnet for development

🔗 Need More Help?
Visit [Hedera Documentation](https://docs.hedera.com) for more information.`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: '💳 Create Wallet', callback_data: 'create_wallet' },
                { text: '💰 Check Balance', callback_data: 'balance' }
            ],
            [
                { text: '💸 Send HBAR', callback_data: 'send_hbar' },
                { text: '🏠 Main Menu', callback_data: 'start' }
            ]
        ]
    };

    await bot.sendMessage(msg.chat.id, helpMessage, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: keyboard
    });
}

export { handleHelp };