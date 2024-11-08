import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

interface EncryptedData {
    encrypted: string;
    iv: string;
    authTag: string;
}

export class CryptoUtils {
    private static async deriveKey(salt: Buffer): Promise<Buffer> {
        if (!ENCRYPTION_KEY) {
            throw new Error('Encryption key is not set');
        }

        return new Promise((resolve, reject) => {
            crypto.pbkdf2(
                ENCRYPTION_KEY,
                salt,
                100000,
                KEY_LENGTH,
                'sha256',
                (err, derivedKey) => {
                    if (err) reject(err);
                    else resolve(derivedKey);
                }
            );
        });
    }

    static async encrypt(text: string): Promise<string> {
        try {
            const salt = crypto.randomBytes(SALT_LENGTH);
            const iv = crypto.randomBytes(IV_LENGTH);

            const key = await this.deriveKey(salt);

            const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

            let encrypted = cipher.update(text, 'utf8', 'base64');
            encrypted += cipher.final('base64');

            const authTag = cipher.getAuthTag();

            const encryptedData: EncryptedData = {
                encrypted: encrypted,
                iv: iv.toString('base64'),
                authTag: authTag.toString('base64')
            };

            return Buffer.concat([
                salt,
                Buffer.from(JSON.stringify(encryptedData))
            ]).toString('base64');

        } catch (error) {
            throw new Error('Encryption failed');
        }
    }

    static async decrypt(encryptedString: string): Promise<string> {
        try {
            const combined = Buffer.from(encryptedString, 'base64');

            const salt = combined.slice(0, SALT_LENGTH);
            const encryptedData: EncryptedData = JSON.parse(
                combined.slice(SALT_LENGTH).toString()
            );

            const key = await this.deriveKey(salt);

            const iv = Buffer.from(encryptedData.iv, 'base64');
            const authTag = Buffer.from(encryptedData.authTag, 'base64');

            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;

        } catch (error) {
            throw new Error('Decryption failed');
        }
    }
}