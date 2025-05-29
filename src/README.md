# Telegram Polymarket Bot - TypeScript Structure

This directory contains the TypeScript Telegram bot code, organized into logical modules for better maintainability, type safety, and separation of concerns.

## File Structure

```
src/
├── config/
│   ├── database.ts          # Prisma database configuration with singleton pattern
│   ├── aws-kms.ts          # AWS KMS client setup and utility functions
│   └── hedera.ts           # Hedera SDK client configuration
├── services/
│   ├── kms-signer.ts       # Custom KMS signer for Hedera SDK integration
│   └── hedera-service.ts   # Hedera blockchain service functions
├── handlers/
│   ├── start-handler.ts    # /start command handler
│   ├── wallet-handler.ts   # Wallet-related commands (/create_wallet, /balance)
│   └── transfer-handler.ts # Transfer commands (/send_hbar)
├── bot.ts                  # Main bot setup and command registration
├── index.ts               # Application entry point
└── README.md              # This file
```

## Module Descriptions

### Configuration (`config/`)
- **`database.js`**: Sets up Prisma client with singleton pattern for production environments
- **`aws-kms.js`**: Configures AWS KMS client and provides encryption/decryption utilities
- **`hedera.js`**: Configures Hedera SDK client and sets up operator credentials

### Services (`services/`)
- **`kms-signer.js`**: Implements custom KMS signer for Hedera SDK transactions
- **`hedera-service.js`**: Contains all Hedera blockchain interaction functions (account creation, balance queries, transfers)

### Handlers (`handlers/`)
- **`start-handler.js`**: Handles the `/start` command
- **`wallet-handler.js`**: Handles wallet-related commands (`/create_wallet`, `/balance`)
- **`transfer-handler.js`**: Handles transfer commands (`/send_hbar`)

### Main Files
- **`bot.ts`**: Sets up the Telegram bot instance and registers all command handlers
- **`index.ts`**: Main entry point that starts the application

## Benefits of This Structure

1. **Type Safety**: Full TypeScript support with compile-time type checking
2. **Separation of Concerns**: Each file has a single responsibility
3. **Maintainability**: Easier to locate and modify specific functionality
4. **Testability**: Individual modules can be tested in isolation
5. **Scalability**: Easy to add new handlers or services
6. **Reusability**: Services can be reused across different handlers
7. **Developer Experience**: Better IDE support with autocomplete and error detection

## Usage

### Development Mode

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Quick setup (recommended):**
   ```bash
   npm run setup
   ```
   This will create `.env` and `.env.example` files for you.

3. **Manual setup (alternative):**
   Copy `.env.example` to `.env` and fill in your actual values:
   ```bash
   cp .env.example .env
   ```

4. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```

5. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

6. **Start the bot in development mode:**
   ```bash
   npm run dev
   ```

7. **Start with auto-reload (recommended for development):**
   ```bash
   npm run dev:watch
   ```

### Production Mode

To run the bot in production:
```bash
npm run prod
```

### Available Scripts

- `npm start` - Run the bot (production mode)
- `npm run dev` - Run the bot in development mode
- `npm run dev:watch` - Run with auto-reload on file changes
- `npm run prod` - Run in production mode with KMS signing
- `npm run setup` - Quick development environment setup
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations (development)
- `npm run db:deploy` - Deploy migrations (production)
- `npm run db:studio` - Open Prisma Studio for database management

### Webhook Deployment (Vercel)

For webhook deployment, uncomment the webhook code in `index.js` and deploy as a serverless function.

## Environment Variables

Make sure to set all required environment variables as documented in the original code:
- `TELEGRAM_BOT_TOKEN`
- `HEDERA_OPERATOR_ID`
- `HEDERA_OPERATOR_PRIVATE_KEY`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_KMS_KEY_ID_OPERATOR`
- `AWS_KMS_KEY_ID_USER_ENCRYPTION`
- And others as needed