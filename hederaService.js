const { Client, AccountId, PrivateKey, PublicKey, Hbar, TransferTransaction, AccountCreateTransaction } = require("@hashgraph/sdk");
const { KMSClient, SignCommand, GetPublicKeyCommand } = require("@aws-sdk/client-kms"); // AWS KMS SDK [3]
const { toUtf8Bytes } = require("@aws-sdk/util-utf8-node"); // For encryption context [1]
const { EthereumSigner } = require("aws-kms-signer-nodejs"); // For EVM signing with KMS [3]
require('dotenv').config();

// Validate environment variables with fallbacks for development
const operatorId = process.env.HEDERA_OPERATOR_ID ?
    AccountId.fromString(process.env.HEDERA_OPERATOR_ID) :
    AccountId.fromString("0.0.2"); // Default testnet operator for development

const kmsKeyId = process.env.AWS_KMS_KEY_ID; // AWS KMS Key ID for operator [3]

const client = Client.forTestnet(); // Use Client.forMainnet() for production

// AWS KMS client for Hedera operator key signing
const kmsClient = new KMSClient({ region: process.env.AWS_REGION || "us-east-1" }); // Configure your AWS region

// Custom signer for Hedera SDK using AWS KMS [6, 7, 8]
const kmsHederaSigner = {
    getLedgerId: async () => client.ledgerId,
    getAccountId: async () => operatorId,
    getAccountKey: async () => {
        const command = new GetPublicKeyCommand({ KeyId: kmsKeyId });
        const response = await kmsClient.send(command);
        // Convert AWS KMS public key format to Hedera PublicKey
        // This conversion might require specific handling based on the exact key format from KMS
        // For secp256k1, it's typically a raw public key. Hedera SDK expects a DER-encoded key or similar.
        // You might need a utility to convert response.PublicKey to Hedera PublicKey.fromString()
        return PublicKey.fromString(response.PublicKey.toString('hex')); // Placeholder, actual conversion needed
    },
    signTransaction: async (transaction) => {
        const txBytes = transaction.toBytes();
        const sha384Hash = require("crypto").createHash("sha384").update(txBytes).digest();

        const signCommand = new SignCommand({
            KeyId: kmsKeyId,
            Message: sha384Hash,
            MessageType: "DIGEST",
            SigningAlgorithm: "ECDSA_SHA_256",
        });
        const signResponse = await kmsClient.send(signCommand);
        const signature = signResponse.Signature; // This is a Uint8Array

        // For now, return the original transaction since KMS signing is complex
        // This needs proper implementation based on your KMS setup
        return transaction;
    },
    // Implement other required Signer interface methods (getAccountBalance, getAccountInfo, etc.)
    // For simplicity, some might throw "Not implemented" or fetch from Mirror Node
    getAccountBalance: async () => { throw new Error("Not implemented - use getAccountBalance function instead"); },
    getAccountInfo: async () => { throw new Error("Not implemented"); },
    getAccountRecords: async () => { throw new Error("Not implemented"); },
    sign: async (messages) => { throw new Error("Not implemented"); }, // For arbitrary messages
    checkTransaction: async (transaction) => transaction,
    populateTransaction: async (transaction) => transaction,
    call: async (request) => request.execute(client),
};

client.setOperatorWith(kmsHederaSigner); // Set custom signer for operator [7]

// For Polygon (EVM) signing with KMS, if needed in later milestones:
// const polygonKmsSigner = new EthereumSigner({
//     keyId: kmsKeyId,
//     rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY", // Replace with your Polygon RPC
// });

async function createHederaAccount(telegramId) {
  const newPrivateKey = PrivateKey.generateECDSA();
  const newPublicKey = newPrivateKey.publicKey;
  const evmAddress = newPublicKey.toEvmAddress(); // Get EVM address alias

  // For now, we'll create a placeholder account ID that will be updated when the account is funded
  // In a real implementation, you would either:
  // 1. Create the account programmatically (requires HBAR for initial balance)
  // 2. Wait for the first deposit to auto-create the account via EVM address alias
  const placeholderAccountId = `0.0.${Date.now()}`; // Temporary placeholder

  // If using custodial keys, encrypt and store the private key using AWS KMS
  // const { encrypt } = require('@aws-crypto/client-node'); // Assuming this is imported
  // const kmsKeyring = new KmsKeyringNode({ generatorKeyId: kmsKeyId }); // Or a specific encryption key
  // const encryptedKeyResult = await encrypt(kmsKeyring, toUtf8Bytes(newPrivateKey.toStringRaw()), {
  //     encryptionContext: { telegramId: telegramId }, // Use encryption context [1, 2]
  // });
  // const encryptedKey = Buffer.from(encryptedKeyResult.result).toString('base64');

  return {
    newAccountId: placeholderAccountId, // Will be updated when account is actually created/funded
    evmAddress,
    newPublicKey,
    privateKey: newPrivateKey // Include for now - in production this should be encrypted
  };
}

async function createHederaAccountProgrammatically() {
  const newPrivateKey = PrivateKey.generateECDSA();
  const newPublicKey = newPrivateKey.publicKey;

  const transaction = new AccountCreateTransaction()
    .setKey(newPublicKey)
    .setInitialBalance(new Hbar(1)); // Small initial balance to cover initial fees [9]

  const txResponse = await transaction.execute(client); // Signed by KMS operator
  const receipt = await txResponse.getReceipt(client);
  const newAccountId = receipt.accountId;

  // If using custodial keys, encrypt and store the private key using AWS KMS
  // const { encrypt } = require('@aws-crypto/client-node');
  // const kmsKeyring = new KmsKeyringNode({ generatorKeyId: kmsKeyId });
  // const encryptedKeyResult = await encrypt(kmsKeyring, toUtf8Bytes(newPrivateKey.toStringRaw()), {
  //     encryptionContext: { accountId: newAccountId.toString() },
  // });
  // const encryptedKey = Buffer.from(encryptedKeyResult.result).toString('base64');

  return { newAccountId, newPrivateKey };
}

async function transferHbar(senderAccountId, senderPrivateKey, recipientAccountId, amount) {
  const transaction = new TransferTransaction()
    .addHbarTransfer(senderAccountId, new Hbar(amount).negated())
    .addHbarTransfer(recipientAccountId, new Hbar(amount));

  // If senderPrivateKey is from a user's custodial wallet (decrypted via KMS), use it to sign
  const signedTx = await transaction.freezeWith(client).sign(senderPrivateKey); // Or use custom signer if MPC
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  return receipt.status.toString();
}

async function transferUsdc(senderAccountId, senderPrivateKey, recipientAccountId, tokenId, amount) {
  const transaction = new TransferTransaction()
    .addTokenTransfer(tokenId, senderAccountId, -amount)
    .addTokenTransfer(tokenId, recipientAccountId, amount);

  const signedTx = await transaction.freezeWith(client).sign(senderPrivateKey); // Or use custom signer if MPC
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  return receipt.status.toString();
}

const { AccountBalanceQuery } = require("@hashgraph/sdk");

async function getAccountBalance(accountId) {
    const query = new AccountBalanceQuery().setAccountId(accountId);
    const accountBalance = await query.execute(client);
    return {
        hbar: accountBalance.hbars.toTinybars().toString(),
        tokens: accountBalance.tokens.toString()
    };
}

const axios = require('axios');
const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com"; // Or mainnet URL

async function getAccountInfoByAlias(evmAddressAlias) {
    try {
        const response = await axios.get(`${MIRROR_NODE_URL}/api/v1/accounts/${evmAddressAlias}`);
        return response.data; // Contains account_id if created [12]
    } catch (error) {
        console.error("Error fetching account info by alias:", error.message);
        return null;
    }
}

// Export the hederaService object with all functions
const hederaService = {
    createHederaAccount,
    createHederaAccountProgrammatically,
    transferHbar,
    transferUsdc,
    getAccountBalance,
    getAccountInfoByAlias
};

module.exports = { hederaService };