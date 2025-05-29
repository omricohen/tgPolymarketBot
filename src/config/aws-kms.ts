// AWS KMS configuration and utilities
import { KMSClient, EncryptCommand, DecryptCommand, SignCommand, GetPublicKeyCommand } from '@aws-sdk/client-kms';
import crypto from 'crypto';

const AWS_REGION: string = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID: string | undefined = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY: string | undefined = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_KMS_KEY_ID_OPERATOR: string | undefined = process.env.AWS_KMS_KEY_ID_OPERATOR;
const AWS_KMS_KEY_ID_USER_ENCRYPTION: string | undefined = process.env.AWS_KMS_KEY_ID_USER_ENCRYPTION;

const kmsClient = new KMSClient({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID!,
        secretAccessKey: AWS_SECRET_ACCESS_KEY!,
    },
});

// AWS KMS Helper Functions
async function encryptWithKMS(plaintext: string, kmsKeyId: string): Promise<string> {
    const encryptCommand = new EncryptCommand({
        KeyId: kmsKeyId,
        Plaintext: Buffer.from(plaintext, 'utf8'),
        EncryptionContext: { 'purpose': 'user-private-key-encryption' },
    });
    const { CiphertextBlob } = await kmsClient.send(encryptCommand);
    return Buffer.from(CiphertextBlob!).toString('base64');
}

async function decryptWithKMS(ciphertextBase64: string, kmsKeyId: string): Promise<string> {
    const decryptCommand = new DecryptCommand({
        CiphertextBlob: Buffer.from(ciphertextBase64, 'base64'),
        EncryptionContext: { 'purpose': 'user-private-key-encryption' },
    });
    const { Plaintext } = await kmsClient.send(decryptCommand);
    return Buffer.from(Plaintext!).toString('utf8');
}

export {
    kmsClient,
    encryptWithKMS,
    decryptWithKMS,
    AWS_KMS_KEY_ID_OPERATOR,
    AWS_KMS_KEY_ID_USER_ENCRYPTION
};