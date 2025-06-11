import winston from 'winston';

// Define custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Create custom format
const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.metadata()
);

// Create the logger
export const logger = winston.createLogger({
  levels,
  format,
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport if not in production
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

class LoggerService {
  // Log request details
  logTelegramRequest(msg: any, command?: string) {
    const logData = {
      userId: msg.from?.id,
      username: msg.from?.username,
      chatId: msg.chat?.id,
      command: command || msg.text,
      timestamp: new Date().toISOString(),
    };

    logger.info('Telegram request received', { ...logData });
  }

  // Log errors
  async logError(error: Error, context: string, metadata?: any) {
    logger.error(`Error in ${context}`, {
      error: {
        message: error.message,
        stack: error.stack,
      },
      ...metadata,
    });
  }

  // Log warnings
  async logWarning(message: string, metadata?: any) {
    logger.warn(message, metadata);
  }

  // Log info
  async logInfo(message: string, metadata?: any) {
    logger.info(message, metadata);
  }

  // Log debug
  logDebug(message: string, metadata?: any) {
    logger.debug(message, metadata);
  }
}

export const loggerService = new LoggerService();
export const { logTelegramRequest, logError, logWarning, logInfo, logDebug } = loggerService;