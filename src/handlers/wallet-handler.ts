// Wallet-related command handlers
const TelegramBot = require('node-telegram-bot-api');
import { prisma } from '../config/database';
import { createHederaAccountAlias, createHederaAccountProgrammatically, getAccountBalance } from '../services/hedera-service';

// /create_wallet command handler
async function handleCreateWallet(bot: any, msg: any): Promise<void> {
    const telegramId: string = msg.chat.id.toString();
    try {
                let user = await prisma.user.findUnique({
            where: { telegramId },
            include: { wallet: true }
        }) as any;

        if (user && user.wallet && user.wallet.hederaAccountId) {
            await bot.sendMessage(telegramId, `You already have a Hedera wallet: \`${user.wallet.hederaAccountId}\`.`);
            return;
        }

        await bot.sendMessage(telegramId, "Generating your Hedera wallet alias... this may take a moment.");

        const { evmAddress, newAccountId, newPublicKey, encryptedPrivateKey } = await createHederaAccountProgrammatically();

        if (!user) {
            user = await prisma.user.create({
                data: {
                    telegramId,
                    wallet: {
                        create: {
                            hederaAccountId: newAccountId || null,
                            hederaEvmAddress: evmAddress!,
                            publicKey: newPublicKey!,
                            encryptedPrivateKey: encryptedPrivateKey
                        }
                    }
                },
                include: { wallet: true }
            });
        } else if (!user.wallet) {
            await prisma.wallet.create({
                data: {
                    userId: user.id,
                    hederaAccountId: newAccountId || null,
                    hederaEvmAddress: evmAddress!,
                    publicKey: newPublicKey!,
                    encryptedPrivateKey: encryptedPrivateKey
                }
            });
        } else {
            await prisma.wallet.update({
                where: { userId: user.id },
                data: {
                    hederaAccountId: newAccountId || null,
                    hederaEvmAddress: evmAddress!,
                    publicKey: newPublicKey!,
                    encryptedPrivateKey: encryptedPrivateKey
                }
            });
        }

        await bot.sendMessage(telegramId, `✅ Your Hedera wallet has been created successfully!\n\n🆔 Account ID: \`${newAccountId}\`\n💳 EVM Address: \`${evmAddress}\`\n\nYou can now use /balance to check your wallet balance.`);
        await bot.sendMessage(telegramId, "💡 Tip: Your wallet has been funded with 10 HBAR to get you started!");

    } catch (error) {
        console.error("Error creating wallet:", error);
        await bot.sendMessage(telegramId, "Failed to create your Hedera wallet. Please try again later. Error: " + (error as Error).message);
    }
}

// /balance command handler
async function handleBalance(bot: any, msg: any): Promise<void> {
    const telegramId: string = msg.chat.id.toString();
    try {
        const user = await prisma.user.findUnique({
            where: { telegramId },
            include: { wallet: true }
        }) as any;

        if (!user || !user.wallet || !user.wallet.hederaEvmAddress) {
            await bot.sendMessage(telegramId, "You don't have a Hedera wallet alias yet. Use /create_wallet to create one.");
            return;
        }

        // For a full implementation, you'd monitor the mirror node for the actual hederaAccountId from the evmAddress
        // For simplicity, we'll use the evmAddress for mirror node queries, but this is less direct.
        // A more robust solution involves a separate process to update `hederaAccountId` in DB.
        const hederaAccountIdForQuery: string = user.wallet.hederaAccountId || user.wallet.hederaEvmAddress; // Prioritize ID if known

        const balance = await getAccountBalance(hederaAccountIdForQuery);

        // Convert tinybars to HBAR (1 HBAR = 100,000,000 tinybars)
        const hbarAmount = parseFloat(balance.hbars) / 100_000_000;

        let response = `💰 Your Hedera Wallet Balance\n\n`;
        response += `🆔 Account: \`${user.wallet.hederaAccountId || user.wallet.hederaEvmAddress}\`\n\n`;
        response += `💎 HBAR: ${hbarAmount.toFixed(8)} ℏ\n`;
        response += `   _(${balance.hbars} tinybars)_\n\n`;

        if (Object.keys(balance.tokens).length > 0) {
            response += `🪙 Tokens:\n`;
            Object.entries(balance.tokens).forEach(([tokenId, amount]) => {
                response += `   • ${tokenId}: ${amount}\n`;
            });
        } else {
            response += `🪙 Tokens: None\n`;
        }

        await bot.sendMessage(telegramId, response, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error("Error fetching balance:", error);
        await bot.sendMessage(telegramId, "Failed to retrieve your balance. Please try again later. Error: " + (error as Error).message);
    }
}

export {
    handleCreateWallet,
    handleBalance
};