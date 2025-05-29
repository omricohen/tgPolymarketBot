// Transfer-related command handlers
const TelegramBot = require('node-telegram-bot-api');
import { prisma } from '../config/database';
import { transferHbar } from '../services/hedera-service';
import { operatorKey } from '../config/hedera';
import { PrivateKey } from '@hashgraph/sdk';

// /send_hbar command handler
async function handleSendHbar(bot: any, msg: any, match: RegExpMatchArray): Promise<void> {
    const telegramId: string = msg.chat.id.toString();
    const recipientIdOrEvm: string = match[1]!;
    const amountHbar: number = parseFloat(match[2]!);

    if (isNaN(amountHbar) || amountHbar <= 0) {
        await bot.sendMessage(telegramId, "Invalid amount. Please specify a positive number for HBAR.");
        return;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { telegramId },
            include: { wallet: true }
        }) as any;

        if (!user || !user.wallet || (!user.wallet.hederaAccountId && !user.wallet.hederaEvmAddress)) {
            await bot.sendMessage(telegramId, "You don't have a Hedera wallet yet. Use /create_wallet.");
            return;
        }

        console.log("user.wallet", user.wallet);
        // Determine sender Hedera AccountId
        const senderAccountId: string = user.wallet.hederaAccountId || user.wallet.hederaEvmAddress; // If AccountId isn't known, use EVM alias
        console.log("Sender Account ID:", senderAccountId);

        let signingKeyOrKmsSigner: PrivateKey | undefined; // = operatorKey; // Default to operator key for simplicity in this example
        // In a real app, if users have their own custodial keys (encrypted), you'd decrypt:
            //  const decryptedKey = await decryptWithKMS(user.wallet.encryptedPrivateKey, AWS_KMS_KEY_ID_USER_ENCRYPTION);
        signingKeyOrKmsSigner = PrivateKey.fromStringECDSA(user.wallet.encryptedPrivateKey);

        await bot.sendMessage(telegramId, `Attempting to send ${amountHbar} HBAR to \`${recipientIdOrEvm}\`...`);

        const status = await transferHbar(senderAccountId, signingKeyOrKmsSigner, recipientIdOrEvm, amountHbar);

        await bot.sendMessage(telegramId, `HBAR transfer status: ${status.status}. You can see the transaction on Hashscan: ${status.hashscanUrl}`);

        // Note: Transaction model would need to be added to schema
        // await prisma.transaction.create({ // Log transaction
        //     data: {
        //         userId: user.id,
        //         type: "HBAR_TRANSFER",
        //         amount: amountHbar.toString(),
        //         asset: "HBAR",
        //         hederaTransactionId: status, // Placeholder, usually a real TxID
        //         status: status === "SUCCESS" ? "COMPLETED" : "FAILED"
        //     }
        // });

    } catch (error) {
        console.error("Error sending HBAR:", error);
        await bot.sendMessage(telegramId, "Failed to send HBAR. Please ensure you have enough balance and the recipient ID is correct. Error: " + (error as Error).message);
    }
}

export {
    handleSendHbar
};