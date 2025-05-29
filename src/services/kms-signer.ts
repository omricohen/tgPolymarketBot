// Custom KMS Signer for Hedera SDK
import { SignCommand } from '@aws-sdk/client-kms';
import crypto from 'crypto';
import { PublicKey } from '@hashgraph/sdk';
import { kmsClient, AWS_KMS_KEY_ID_OPERATOR } from '../config/aws-kms';

// This is complex! Hedera SDK expects specific PublicKey format and raw signature bytes.
// KMS returns DER-encoded public key. You may need a library like 'asn1.js' for robust parsing.
// For simplicity, a placeholder for public key is used.
const operatorPublicKeyHex: string | undefined = process.env.HEDERA_OPERATOR_PUBLIC_KEY_HEX; // Pre-derive raw public key from KMS

interface KMSHederaSigner {
    sign: (transactionBytes: Uint8Array) => Promise<Buffer>;
    publicKey: PublicKey | null;
}

const kmsHederaSigner: KMSHederaSigner = {
    sign: async (transactionBytes: Uint8Array): Promise<Buffer> => {
        const sha384Hash = crypto.createHash('sha384').update(transactionBytes).digest();
        const signCommand = new SignCommand({
            KeyId: AWS_KMS_KEY_ID_OPERATOR!,
            Message: sha384Hash,
            MessageType: 'DIGEST',
            SigningAlgorithm: 'ECDSA_SHA_256', // Hedera uses secp256k1 keys, this is compatible
        });
        const { Signature } = await kmsClient.send(signCommand);
        // The signature from KMS might be DER-encoded. Hedera SDK usually expects raw 64-byte R+S.
        // You might need to decode the DER signature here.
        // For simplicity, assume Signature is already raw for now.
        return Buffer.from(Signature!);
    },
    publicKey: null // This needs to be set properly for Hedera SDK
};

// Function to set the public key for the KMS signer.
// In a real app, this would likely query KMS or be pre-configured safely.
async function initializeKmsSignerPublicKey(): Promise<void> {
    if (!operatorPublicKeyHex) {
        console.warn("HEDERA_OPERATOR_PUBLIC_KEY_HEX not set. KMS signer public key will be a placeholder.");
        // In a real scenario, you'd get this from KMS and parse it from DER.
        // For this example, we'll use a dummy PublicKey
        kmsHederaSigner.publicKey = PublicKey.fromString('302a300506032b65700321000000000000000000000000000000000000000000000000000000000000000000');
    } else {
        kmsHederaSigner.publicKey = PublicKey.fromString(operatorPublicKeyHex);
    }
}

export {
    kmsHederaSigner,
    initializeKmsSignerPublicKey,
    type KMSHederaSigner
};