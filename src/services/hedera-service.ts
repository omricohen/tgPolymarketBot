// Hedera service functions
import { PrivateKey, Hbar, TransferTransaction, AccountCreateTransaction, AccountBalanceQuery, TokenAssociateTransaction, TokenId, AccountId, Client } from '@hashgraph/sdk';
import {AccountBalanceJson} from '@hashgraph/sdk';
import { client } from '../config/hedera';
import { encryptWithKMS, AWS_KMS_KEY_ID_USER_ENCRYPTION } from '../config/aws-kms';
import { type KMSHederaSigner } from './kms-signer';

const HASHSCAN_BASE_URL = process.env.NODE_ENV === 'production'
    ? "https://hashscan.io/mainnet/transaction/"
    : "https://hashscan.io/testnet/transaction/";

interface AccountAliasResult {
    evmAddress?: string;
    newAccountId?: string | undefined;
    newPublicKey?: string;
    encryptedPrivateKey: string | null;
}

interface TransferResult {
    status: string;
    transactionId: string;
    hashscanUrl: string;
}

/**
 * Generates a new Hedera ECDSA key pair and derives its EVM address alias.
 * This does NOT create an account on Hedera immediately. The account
 * will be auto-created when funds are first sent to the returned EVM address.
 * Optionally encrypts the private key using AWS KMS if custodial storage is enabled.
 *
 * @returns {Promise<AccountAliasResult>} An object containing the EVM address, public key, and (optionally encrypted) private key.
 */
async function createHederaAccountAlias(): Promise<AccountAliasResult> {
    console.log("Generating new Hedera key pair and EVM address alias...");

    // 1. Generate a new ECDSA private key
    const accountPrivateKey = PrivateKey.generateECDSA();
    const accountPublicKey = accountPrivateKey.publicKey;
    const evmAddress = "0x" + accountPublicKey.toEvmAddress(); // Ensure '0x' prefix for clarity

    console.log("New Public Key:", accountPublicKey.toString());
    console.log("Generated EVM Address Alias:", evmAddress);

    // 2. Handle optional KMS encryption for the private key if custodial storage is enabled
    let encryptedPrivateKeyString: string | null = null;

        try {
            encryptedPrivateKeyString = await encryptWithKMS(accountPrivateKey.toStringRaw(), process.env.AWS_KMS_KEY_ID_USER_ENCRYPTION!);
            console.log("User private key encrypted with KMS for storage.");
        } catch (kmsError) {
            console.error("CRITICAL ERROR: Failed to encrypt user private key with KMS:", kmsError);
            // In a real application, you might want to:
            // 1. Log this failure and alert ops.
            // 2. Decide if you want to proceed without storing the key (risky for 'on behalf' bets).
            // 3. Throw the error to prevent wallet creation if key storage is mandatory.
            throw new Error("Failed to securely generate wallet (KMS encryption failed).");
        }
    // 3. Return the necessary details
    return {
        evmAddress: evmAddress,
        newPublicKey: accountPublicKey.toString(),
        encryptedPrivateKey: encryptedPrivateKeyString, // This will be null, encrypted, or plaintext for dev
    };
}

async function createHederaAccountProgrammatically(): Promise<AccountAliasResult> {
   // Your account ID and private key from string value
   const MY_ACCOUNT_ID = AccountId.fromString("0.0.6061899");
   const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA("adae74c2ab2bfdd949ecbbe1bd722f811e1e5943866c9bd9edca458ed1e0b1d0");

   // Pre-configured client for test network (testnet)
   const client = Client.forTestnet();

   //Set the operator with the account ID and private key
   client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

   // Start your code here


   // Generate a new key for the account
   const accountPrivateKey = PrivateKey.generateECDSA();
   const accountPublicKey = accountPrivateKey.publicKey;

   const txCreateAccount = new AccountCreateTransaction()
     .setAlias(accountPublicKey.toEvmAddress()) //Do NOT set an alias if you need to update/rotate keys
     .setKey(accountPublicKey)
     .setInitialBalance(new Hbar(10));

   //Sign the transaction with the client operator private key and submit to a Hedera network
   const txCreateAccountResponse = await txCreateAccount.execute(client);

   //Request the receipt of the transaction
   const receiptCreateAccountTx= await txCreateAccountResponse.getReceipt(client);

   //Get the transaction consensus status
   const statusCreateAccountTx = receiptCreateAccountTx.status;

   //Get the Account ID o
   const accountId = receiptCreateAccountTx.accountId;

   //Get the Transaction ID
   const txIdAccountCreated = txCreateAccountResponse.transactionId.toString();


   console.log("------------------------------ Create Account ------------------------------ ");
   console.log("Receipt status       :", statusCreateAccountTx.toString());
   console.log("Transaction ID       :", txIdAccountCreated);
   console.log("Hashscan URL         :", `https://hashscan.io/testnet/tx/${txIdAccountCreated}`);
   console.log("Account ID           :", accountId?.toString());
   console.log("Public key           :", accountPublicKey.toString());
   console.log("EVM address          :", accountPublicKey.toEvmAddress());
   console.log("EVM address          :", accountPublicKey.toEvmAddress());


   try {
      const encryptedPrivateKeyString = await encryptWithKMS(accountPrivateKey.toStringRaw(), process.env.AWS_KMS_KEY_ID_USER_ENCRYPTION!);
      console.log("User private key encrypted with KMS.");

      return {
        newAccountId: accountId?.toString(),
        evmAddress: "0x"+accountPublicKey.toEvmAddress(),
        newPublicKey: accountPublicKey.toString(),
        encryptedPrivateKey: encryptedPrivateKeyString
      };
  } catch (kmsError) {
      console.error("Failed to encrypt user private key with KMS:", kmsError);
      // Handle this error appropriately: e.g., throw, or decide not to store the key.
      throw new Error("Failed to securely store user private key.");
  }

}

async function getAccountBalance(accountId: string | AccountId): Promise<AccountBalanceJson> {
  const query = new AccountBalanceQuery().setAccountId(accountId);
  const accountBalance = await query.execute(client);
  return accountBalance.toJSON();
}

async function transferHbar(senderAccountId: string | AccountId,
   senderPrivateKey: PrivateKey,
   recipientAccountId: string | AccountId,
   amount: number
): Promise<TransferResult> {
  const transaction = new TransferTransaction()
    .addHbarTransfer(senderAccountId, new Hbar(amount).negated())
    .addHbarTransfer(recipientAccountId, new Hbar(amount));

  // If senderPrivateKey is from a user's custodial wallet (decrypted via KMS), use it to sign
  const signedTx = await transaction.freezeWith(client).sign(senderPrivateKey); // Or use custom signer if MPC
  const txResponse = await signedTx.execute(client);
  console.log("TxResponse:", txResponse);
  const receipt = await txResponse.getReceipt(client);
  console.log("Receipt:", receipt);
  return {
    status: receipt.status.toString(),
    transactionId: txResponse.transactionId.toString(), // Get the transaction ID string
    hashscanUrl: `${HASHSCAN_BASE_URL}${txResponse.transactionId.toString()}`
  };
}


async function transferUsdc(
    senderAccountId: string | AccountId,
    senderSigningKeyOrKmsSigner: PrivateKey,
    recipientAccountId: string | AccountId,
    usdcTokenId: string,
    amount: number
): Promise<TransferResult> {

  const transaction = new TransferTransaction()
    .addTokenTransfer(usdcTokenId, senderAccountId, -amount)
    .addTokenTransfer(usdcTokenId, recipientAccountId, amount);

  const signedTx = await transaction.freezeWith(client).sign(senderSigningKeyOrKmsSigner); // Or use custom signer if MPC
  const txResponse = await signedTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  return {
    status: receipt.status.toString(),
    transactionId: txResponse.transactionId.toString(), // Get the transaction ID string
    hashscanUrl: `${HASHSCAN_BASE_URL}${txResponse.transactionId.toString()}`
  };
}


export {
    createHederaAccountAlias,
    createHederaAccountProgrammatically,
    getAccountBalance,
    transferHbar,
    transferUsdc,
    type AccountAliasResult,
};