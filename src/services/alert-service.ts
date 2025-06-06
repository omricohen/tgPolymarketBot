import { bot } from '../bot';
import { logger } from './logger-service';

interface AlertOptions {
    parseMode?: 'Markdown' | 'HTML';
    disableNotification?: boolean;
}

class AlertService {
    private alertChatId: string;
    private environment: string;
    private minAlertLevel: string;

    constructor() {
        this.alertChatId = process.env.ALERT_TELEGRAM_CHAT_ID || '';
        this.environment = process.env.NODE_ENV || 'development';
        this.minAlertLevel = process.env.MIN_ALERT_LEVEL || 'error'; // error, warn, info
        
        if (!this.alertChatId) {
            logger.warn('Telegram alert chat ID not configured. Alerts will not be sent.');
        }
    }

    private shouldAlert(level: string): boolean {
        const levels = {
            'info': 0,
            'warn': 1,
            'error': 2
        };

        return levels[level as keyof typeof levels] >= levels[this.minAlertLevel as keyof typeof levels];
    }

    private async sendTelegramAlert(message: string, options: AlertOptions = {}) {
        if (!this.alertChatId) return;

        try {
            await bot.sendMessage(
                this.alertChatId,
                message,
                {
                    parse_mode: options.parseMode || 'Markdown',
                    disable_notification: options.disableNotification
                }
            );
        } catch (error) {
            logger.error('Failed to send Telegram alert', { error });
        }
    }

    async alertError(error: Error, context: string, metadata?: any) {
        if (!this.shouldAlert('error')) return;

        let message = `🚨 *Error Alert*\n\n`;
        message += `*Environment:* ${this.environment}\n`;
        message += `*Context:* ${context}\n`;
        message += `*Error:* ${error.message}\n\n`;

        if (metadata) {
            message += `*Metadata:*\n\`\`\`\n${JSON.stringify(metadata, null, 2)}\n\`\`\`\n`;
        }

        if (error.stack) {
            // Truncate stack trace if too long (Telegram has a 4096 char limit)
            const stack = error.stack.length > 1000 ? error.stack.slice(0, 997) + '...' : error.stack;
            message += `*Stack Trace:*\n\`\`\`\n${stack}\n\`\`\``;
        }

        await this.sendTelegramAlert(message, {
            parseMode: 'Markdown',
            disableNotification: false
        });
    }

    async alertWarning(message: string, context: string, metadata?: any) {
        if (!this.shouldAlert('warn')) return;

        let alertMessage = `⚠️ *Warning Alert*\n\n`;
        alertMessage += `*Environment:* ${this.environment}\n`;
        alertMessage += `*Context:* ${context}\n`;
        alertMessage += `*Message:* ${message}\n`;

        if (metadata) {
            alertMessage += `\n*Metadata:*\n\`\`\`\n${JSON.stringify(metadata, null, 2)}\n\`\`\``;
        }

        await this.sendTelegramAlert(alertMessage, {
            parseMode: 'Markdown',
            disableNotification: true
        });
    }

    async alertInfo(message: string, context: string, metadata?: any) {
        if (!this.shouldAlert('info')) return;

        let alertMessage = `ℹ️ *Info Alert*\n\n`;
        alertMessage += `*Environment:* ${this.environment}\n`;
        alertMessage += `*Context:* ${context}\n`;
        alertMessage += `*Message:* ${message}\n`;

        if (metadata) {
            alertMessage += `\n*Metadata:*\n\`\`\`\n${JSON.stringify(metadata, null, 2)}\n\`\`\``;
        }

        await this.sendTelegramAlert(alertMessage, {
            parseMode: 'Markdown',
            disableNotification: true
        });
    }
}

export const alertService = new AlertService(); 