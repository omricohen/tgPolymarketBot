#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';

console.log('🚀 Setting up development environment...\n');

// Check if .env exists
const envPath: string = path.join(process.cwd(), '.env');
const envExamplePath: string = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Created .env file from .env.example');
        console.log('⚠️  Please edit .env file with your actual values\n');
    } else {
        console.log('⚠️  No .env.example found. Please create .env manually\n');
    }
} else {
    console.log('✅ .env file already exists\n');
}

// Create example .env.example if it doesn't exist
if (!fs.existsSync(envExamplePath)) {
    const envExample: string = `# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Hedera Configuration
HEDERA_OPERATOR_ID=0.0.123456
HEDERA_OPERATOR_PRIVATE_KEY=your_hedera_private_key_here
HEDERA_OPERATOR_PUBLIC_KEY_HEX=your_hedera_public_key_hex_here

# AWS KMS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_KMS_KEY_ID_OPERATOR=your_kms_operator_key_id_here
AWS_KMS_KEY_ID_USER_ENCRYPTION=your_kms_user_encryption_key_id_here

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/telegram_bot_db?schema=public"

# Application Configuration
NODE_ENV=development
USE_CUSTODIAL_KEYS=false

# Optional: Port for webhook mode
PORT=3000`;

    fs.writeFileSync(envExamplePath, envExample);
    console.log('✅ Created .env.example file\n');
}

console.log('📋 Next steps:');
console.log('1. Edit .env file with your actual configuration values');
console.log('2. Run: npm run db:generate');
console.log('3. Run: npm run db:migrate');
console.log('4. Run: npm run dev:watch');
console.log('\n�� Happy coding!');