# Development Guide - TypeScript

## Quick Start

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd telegram-polymarket-bot
   npm install
   ```

2. **Setup environment:**
   ```bash
   npm run setup
   ```

3. **Configure your environment:**
   Edit the `.env` file with your actual values:
   - Get a Telegram bot token from [@BotFather](https://t.me/botfather)
   - Set up your Hedera testnet account
   - Configure AWS KMS (optional for development)
   - Set up your database connection

4. **Initialize database:**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Start developing:**
   ```bash
   npm run dev:watch
   ```

## Development vs Production

### Development Mode (`NODE_ENV=development`)
- Uses direct private keys (no KMS)
- Connects to Hedera testnet
- Enables detailed logging
- Auto-reloads on file changes with nodemon

### Production Mode (`NODE_ENV=production`)
- Uses AWS KMS for signing
- Connects to Hedera mainnet
- Optimized for serverless deployment
- Enhanced security features

## Environment Variables

### Required for Development
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
HEDERA_OPERATOR_ID=0.0.123456
HEDERA_OPERATOR_PRIVATE_KEY=your_private_key
DATABASE_URL=your_database_connection_string
```

### Required for Production
```bash
# All development variables plus:
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_KMS_KEY_ID_OPERATOR=your_kms_key_id
AWS_KMS_KEY_ID_USER_ENCRYPTION=your_encryption_key_id
HEDERA_OPERATOR_PUBLIC_KEY_HEX=your_public_key_hex
```

## Project Structure

```
telegram-polymarket-bot/
├── src/
│   ├── config/          # Configuration modules
│   ├── services/        # Business logic services
│   ├── handlers/        # Telegram command handlers
│   ├── bot.js          # Bot setup and registration
│   └── index.js        # Application entry point
├── scripts/            # Development scripts
├── prisma/            # Database schema and migrations
└── package.json       # Dependencies and scripts
```

## Common Development Tasks

### Adding a New Command
1. Create handler in `src/handlers/`
2. Register in `src/bot.js`
3. Test with `npm run dev:watch`

### Database Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Update your code to use new schema

### Testing
```bash
# Start the bot
npm run dev:watch

# In another terminal, open Prisma Studio
npm run db:studio
```

## Troubleshooting

### Common Issues
1. **Bot not responding**: Check `TELEGRAM_BOT_TOKEN`
2. **Database errors**: Verify `DATABASE_URL` and run migrations
3. **Hedera errors**: Check operator ID and private key
4. **KMS errors**: Verify AWS credentials and permissions

### Debug Mode
Set additional environment variables for debugging:
```bash
DEBUG=telegram-bot:*
LOG_LEVEL=debug
```

## Deployment

### Local Development
```bash
npm run dev:watch
```

### Production (Vercel)
1. Uncomment webhook code in `src/index.js`
2. Set environment variables in Vercel dashboard
3. Deploy with `vercel --prod`

### Production (Traditional Server)
```bash
npm run prod
```