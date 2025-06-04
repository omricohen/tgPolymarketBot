// /help command handler
const TelegramBot = require('node-telegram-bot-api');

async function handleHelp(bot: any, msg: any): Promise<void> {
    const helpMessage = `🤖 *Hedera Polymarket Bot Help*

I can help you manage your Hedera wallet and explore Polymarket prediction markets.

📋 *Available Actions:*

💳 *Wallet Commands:*
• \`/create_wallet\` - Create a new Hedera wallet
• \`/balance\` - View your wallet balance
• \`/send_hbar <recipient> <amount>\` - Transfer HBAR

🎯 *Polymarket Commands:*
• \`/search_markets <term>\` - Search prediction markets

💡 *Tips:*
• Your wallet is automatically funded with 10 tinybars when created
• You can send HBAR to both Account IDs \(0.0.xxxxx\) and EVM addresses
• All transactions are on Hedera Testnet for development
• Use search\\_markets to find interesting prediction markets
• Click market links to trade on Polymarket

🔗 *Need More Help?*
Visit [Hedera Docs](https://docs.hedera.com) or [Polymarket](https://polymarket.com) for more information.`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: '💳 Create Wallet', callback_data: 'create_wallet' },
                { text: '💰 Check Balance', callback_data: 'balance' }
            ],
            [
                { text: '💸 Send HBAR', callback_data: 'send_hbar' },
                { text: '🔍 Search Markets', callback_data: 'search_markets' }
            ],
            [
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