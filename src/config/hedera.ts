// Hedera SDK configuration
import { Client, AccountId, PrivateKey } from '@hashgraph/sdk';
import { kmsHederaSigner, initializeKmsSignerPublicKey, type KMSHederaSigner } from '../services/kms-signer';

const operatorId: AccountId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID!);
// For production, use kmsHederaSigner. For dev/test, can use direct key:
const operatorKey: PrivateKey | KMSHederaSigner = process.env.NODE_ENV === 'production'
    ? kmsHederaSigner
    : PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_PRIVATE_KEY!);

const client: Client = Client.forTestnet(); // Use Client.forMainnet() for production

// Set operator with proper type handling
if (process.env.NODE_ENV === 'production') {
    client.setOperator(operatorId, operatorKey as any); // KMS signer needs special handling
} else {
    client.setOperator(operatorId, operatorKey as PrivateKey);
}

// Initialize KMS signer if in production
if (process.env.NODE_ENV === 'production') {
    initializeKmsSignerPublicKey();
}

export {
    client,
    operatorId,
    operatorKey
};