// /start command handler
const TelegramBot = require('node-telegram-bot-api');

async function handleStart(bot: any, msg: any): Promise<void> {
    const welcomeMessage = `🎉 Welcome to the Hedera Polymarket Bot!

I can help you manage your Hedera wallet for Polymarket predictions and DeFi activities.

Choose an action from the buttons below to get started! 🚀`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: '💳 Create Wallet', callback_data: 'create_wallet' },
                { text: '🔑 Wallet Info', callback_data: 'wallet_info' }
            ],
            [
                { text: '💰 Check Balance', callback_data: 'balance' },
                { text: '💸 Send HBAR', callback_data: 'send_hbar' }
            ],
            [
                { text: '🔍 Search Markets', callback_data: 'search_markets' },
                { text: '❓ Help', callback_data: 'help' }
            ]
        ]
    };

    await bot.sendMessage(msg.chat.id, welcomeMessage, {
        reply_markup: keyboard
    });
}

export { handleStart };