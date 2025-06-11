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
            await bot.sendMessage(telegramId,
                "You already have a Hedera wallet. Use /wallet_info to see your wallet details or /balance to check your balance.");
            return;
        }

        await bot.sendMessage(telegramId, "Generating your Hedera wallet alias... this may take a moment.");
        let evmAddress, newAccountId, newPublicKey, encryptedPrivateKey;
        // BLADE CANNOT SEND FUNDS TO a 0x address without an account
        //if its prod, create new account regular, otherwise create new account programmatically
        // if (process.env.NODE_ENV === 'production') {
        //     ({ evmAddress, newAccountId, newPublicKey, encryptedPrivateKey } = await createHederaAccountAlias());
        // } else {
            ({ evmAddress, newAccountId, newPublicKey, encryptedPrivateKey } = await createHederaAccountProgrammatically());
        // }

        if (!user) {
            user = await prisma.user.create({
                data: {
                    telegramId,
                    telegramHandle: msg.chat.username,
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

        if (user.telegramHandle !== msg.chat.username) {
            await prisma.user.update({
                where: { id: user.id },
                data: { telegramHandle: msg.chat.username }
            });
        }

        // Create wallet details message with the newly created wallet information
        let walletDetailsMessage = "✅ Your Hedera wallet has been created successfully!\n\n";
        walletDetailsMessage += "🔑 *Your Wallet Details*\n\n" +
        "*Hedera Account ID:*\n" +
        "`" + (user.wallet.hederaAccountId || "Not yet available") + "`\n\n" +
        "*EVM Address:*\n" +
        "`" + user.wallet.hederaEvmAddress + "`\n\n" +
        "📊 Use \/balance to check your current balance\n" +
        "💸 Use \/send\\_hbar to send HBAR to another wallet";

        try {
            await bot.sendMessage(telegramId, walletDetailsMessage, {
                parse_mode: 'MarkdownV2'
            });
        } catch (markdownError) {
            console.error("Error sending wallet creation message with markdown:", markdownError);
            // If Markdown parsing fails, send a plain text version
            const plainMessage =
                "✅ Your Hedera wallet has been created successfully!\n\n" +
                "🔑 Your Wallet Details:\n\n" +
                "Hedera Account ID:\n" +
                (newAccountId || "Not yet available") + "\n\n" +
                "EVM Address:\n" +
                evmAddress + "\n\n" +
                "💰 Your wallet has been funded with 10 ℏ to get you started!\n\n" +
                "📊 Use /balance to check your current balance\n" +
                "💸 Use /send_hbar to send HBAR to another wallet";

            await bot.sendMessage(telegramId, plainMessage);
        }

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
            await bot.sendMessage(telegramId, "You don't have a Hedera wallet yet. Use /create_wallet to create one.");
            return;
        }

        const hederaAccountIdForQuery: string = user.wallet.hederaAccountId || user.wallet.hederaEvmAddress;

        const balance = await getAccountBalance(hederaAccountIdForQuery);
        const hbarAmount = parseFloat(balance.hbars);

        let response = `💰 Your Hedera Wallet Balance\n\n`;
        response += `🆔 Account:\n\`${user.wallet.hederaAccountId || user.wallet.hederaEvmAddress}\`\n\n`;
        response += `💎 HBAR: ${hbarAmount.toFixed(6)} ℏ\n`;
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

// /wallet_info command handler
async function handleWalletInfo(bot: any, msg: any): Promise<void> {
    const telegramId: string = msg.chat.id.toString();
    try {
        const user = await prisma.user.findUnique({
            where: { telegramId },
            include: { wallet: true }
        }) as any;

        if (!user || !user.wallet) {
            await bot.sendMessage(telegramId, "You don't have a Hedera wallet yet. Use /create_wallet to create one.");
            return;
        }

        // First try with Markdown formatting
        const markdownMessage =
            "🔑 *Your Wallet Details*\n\n" +
            "*Hedera Account ID:*\n" +
            "`" + (user.wallet.hederaAccountId || "Not yet available") + "`\n\n" +
            "*EVM Address:*\n" +
            "`" + user.wallet.hederaEvmAddress + "`\n\n" +
            "📊 Use \/balance to check your current balance\n" +
            "💸 Use \/send\\_hbar to send HBAR to another wallet";



        try {
            await bot.sendMessage(telegramId, markdownMessage, {
                parse_mode: 'MarkdownV2'
            });
        } catch (markdownError) {
            console.error("Error sending wallet info:", markdownError);
            // If Markdown parsing fails, send a plain text version
            const plainMessage =
                "🔑 Your Wallet Details\n\n" +
                "Hedera Account ID:\n" +
                (user.wallet.hederaAccountId || "Not yet available") + "\n\n" +
                "EVM Address:\n" +
                user.wallet.hederaEvmAddress + "\n\n" +
                "💡 Use the buttons below to copy addresses\n\n" +
                "📊 Use /balance to check your current balance\n" +
                "💸 Use /send_hbar to send HBAR to another wallet";

            await bot.sendMessage(telegramId, plainMessage);
        }
    } catch (error) {
        console.error("Error fetching wallet info:", error);
        await bot.sendMessage(telegramId, "Failed to retrieve your wallet information. Please try again later.");
    }
}

export {
    handleCreateWallet,
    handleBalance,
    handleWalletInfo
};