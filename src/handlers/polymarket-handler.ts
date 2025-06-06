import TelegramBot from 'node-telegram-bot-api';
import { PolymarketService } from '../services/polymarket-service';

const polymarketService = new PolymarketService();

export async function handleSearchMarkets(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null) {
    const chatId = msg.chat.id;
    
    if (!match || !match[1]) {
        await bot.sendMessage(chatId, 
            "Please provide a search term. Example:\n" +
            "`/search_markets bitcoin`", 
            { parse_mode: 'Markdown' }
        );
        return;
    }

    const searchQuery = match[1].trim();
    
    try {
        const markets = await polymarketService.searchMarkets(searchQuery, {limit: 10});
        
        if (markets.length === 0) {
            await bot.sendMessage(chatId, "No markets found matching your search term.");
            return;
        }

        // Create a numbered list of markets
        let messageText = `*Search Results for "${searchQuery}"*\n\n`;
        markets.forEach((market, index) => {
            const priceStr = market.tokens
                .map(token => {
                    if (typeof token === 'object' && token !== null && !Array.isArray(token)) {
                        return `${(token as {outcome?: string}).outcome}: $${(token as {price?: number}).price?.toFixed(2)}`;
                    }
                    return '';
                })
                .join(' | ');
            
            messageText += `${index + 1}. *${market.question}*\n` +
                         `📊 ${priceStr}\n` +
                         `⏰ Ends: ${new Date(market.endDate).toLocaleDateString()}\n\n`;
        });

        // Create buttons in rows of 5
        const buttons = markets.map((market, index) => ({
            text: `${index + 1}`,
            callback_data: `market_details:${market.id}`
        }));

        const keyboard = [];
        for (let i = 0; i < buttons.length; i += 5) {
            keyboard.push(buttons.slice(i, i + 5));
        }

        const inlineKeyboard = {
            inline_keyboard: keyboard
        };

        await bot.sendMessage(chatId, messageText, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: inlineKeyboard
        });
    } catch (error) {
        console.error('Error in handleSearchMarkets:', error);
        await bot.sendMessage(chatId, 
            "Sorry, there was an error searching for markets. Please try again later."
        );
    }
}

export async function handleMarketDetails(bot: TelegramBot, msg: TelegramBot.Message, marketId: string) {
    const chatId = msg.chat.id;
    
    try {
        const market = await polymarketService.getMarket(marketId);
        
        if (!market) {
            await bot.sendMessage(chatId, "Market not found.");
            return;
        }

        // Create a detailed market view
        const priceStr = market.tokens
            .map(token => {
                if (typeof token === 'object' && token !== null && !Array.isArray(token)) {
                    const outcome = (token as {outcome?: string}).outcome;
                    const price = (token as {price?: number}).price;
                    return `${outcome}:\n` +
                           `  Price: $${price?.toFixed(2)}`;
                }
                return '';
            })
            .join('\n\n');

        const message = `*${market.question}*\n\n` +
            `📊 *Market Details*\n\n` +
            `${priceStr}\n\n` +
            `📝 Description: ${market.description}\n\n` +
            `⏰ Resolution Date: ${new Date(market.endDate).toLocaleDateString()}\n` +
            `${market.gameStartTime ? `🎮 Game Start: ${new Date(market.gameStartTime).toLocaleDateString()}\n` : ''}` +
            `⚙️ Status: ${market.active ? 'Active' : 'Inactive'}${market.closed ? ' (Closed)' : ''}\n\n` +
            `🔗 [Trade on Polymarket](https://polymarket.com/event/${market.marketSlug})`;

        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
    } catch (error) {
        console.error('Error in handleMarketDetails:', error);
        await bot.sendMessage(chatId, 
            "Sorry, there was an error fetching market details. Please try again later."
        );
    }
}
