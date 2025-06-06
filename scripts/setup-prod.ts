import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

const requiredEnvVars = [
    'NODE_ENV',
    'TELEGRAM_BOT_TOKEN',
    'DATABASE_URL',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_KMS_KEY_ID_USER_ENCRYPTION'
];

async function checkEnvironment() {
    console.log('🔍 Checking environment variables...');
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingVars.forEach(varName => console.error(`   - ${varName}`));
        process.exit(1);
    }
    
    if (process.env.NODE_ENV !== 'production') {
        console.error('❌ NODE_ENV must be set to "production"');
        process.exit(1);
    }
    
    console.log('✅ Environment variables verified');
}

async function checkDatabase() {
    console.log('🔍 Checking database connection...');
    const prisma = new PrismaClient();
    
    try {
        await prisma.$connect();
        console.log('✅ Database connection successful');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function checkFileSystem() {
    console.log('🔍 Checking file system...');
    
    // Check if dist directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'dist'))) {
        console.error('❌ dist directory not found. Run "npm run build" first');
        process.exit(1);
    }
    
    // Check if logs directory exists, create if not
    const logsDir = path.join(process.cwd(), 'logs');
    const pm2LogsDir = path.join(logsDir, 'pm2');
    
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
    }
    if (!fs.existsSync(pm2LogsDir)) {
        fs.mkdirSync(pm2LogsDir);
    }
    
    console.log('✅ File system checks passed');
}

async function main() {
    console.log('🚀 Starting production setup verification...\n');
    
    try {
        await checkEnvironment();
        await checkDatabase();
        await checkFileSystem();
        
        console.log('\n✨ All checks passed! You can now start the bot with:');
        console.log('   npm run prod');
        console.log('\n📊 Monitor the bot with:');
        console.log('   npm run prod:monitor');
        console.log('\n📜 View logs with:');
        console.log('   npm run prod:logs');
    } catch (error) {
        console.error('\n❌ Setup verification failed:', error);
        process.exit(1);
    }
}

main(); 