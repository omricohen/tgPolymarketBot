// Hedera SDK configuration
import { Client, AccountId, PrivateKey } from '@hashgraph/sdk';
import { kmsHederaSigner, initializeKmsSignerPublicKey, type KMSHederaSigner } from '../services/kms-signer';
import { logInfo, logError } from '../services/logger-service';

const operatorId: AccountId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID!);

// For production, use kmsHederaSigner. For dev/test, can use direct key:
//process.env.NODE_ENV === 'production'
//? kmsHederaSigner
//: 
const operatorKey: PrivateKey | KMSHederaSigner = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_PRIVATE_KEY!);

// Initialize client based on environment
const client: Client = process.env.NODE_ENV === 'production'
    ? Client.forMainnet()
    : Client.forTestnet();

logInfo('Initializing Hedera client', {
    network: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet',
    operatorId: operatorId.toString()
});

// Set operator with proper type handling
try {
    if (process.env.NODE_ENV === 'production') {
        client.setOperator(operatorId, operatorKey as any); // KMS signer needs special handling
        logInfo('Hedera operator set with KMS signer');
    } else {
        client.setOperator(operatorId, operatorKey as PrivateKey);
        logInfo('Hedera operator set with private key');
    }

    // Initialize KMS signer if in production
    if (process.env.NODE_ENV === 'production') {
        initializeKmsSignerPublicKey()
            .then(() => logInfo('KMS signer public key initialized'))
            .catch(error => logError(error, 'Failed to initialize KMS signer public key'));
    }
} catch (error) {
    logError(error as Error, 'Failed to set Hedera operator');
    process.exit(1);
}

export {
    client,
    operatorId,
    operatorKey
};