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

        for (const market of markets) {
            const priceStr = market.tokens
                .map(token => {
                    if (typeof token === 'object' && token !== null && !Array.isArray(token)) {
                        return (token as {outcome?: string}).outcome + ': ' + (token as {price?: number}).price?.toFixed(2) + '%';
                    }
                    return '';
                })
                .join('\n');
            
            const message = `*${market.question}*\n\n` +
                `📊 Current Probabilities:\n${priceStr}\n\n` +
                // `💰 Volume: $${parseFloat(market.volume).toLocaleString()}\n` +
                `⏰ Ends: ${new Date(market.endDate).toLocaleDateString()}\n\n` +
                `[View on Polymarket](https://polymarket.com/event/${market.marketSlug})`;

            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        }
    } catch (error) {
        console.error('Error in handleSearchMarkets:', error);
        await bot.sendMessage(chatId, 
            "Sorry, there was an error searching for markets. Please try again later."
        );
    }
}

// export async function handleMarketDetails(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null) {
//     const chatId = msg.chat.id;
    
//     if (!match || !match[1]) {
//         await bot.sendMessage(chatId, 
//             "Please provide a market ID. Example:\n" +
//             "`/market_details 12345`", 
//             { parse_mode: 'Markdown' }
//         );
//         return;
//     }

//     const marketId = match[1].trim();
    
//     try {
//         const market = await polymarketService.getMarketDetails(marketId);
        
//         if (!market) {
//             await bot.sendMessage(chatId, "Market not found.");
//             return;
//         }

//         const priceStr = market.prices
//             .map((price, idx) => `${market.outcomes[idx]}: ${(price * 100).toFixed(2)}%`)
//             .join('\n');
        
//         const message = `*${market.question}*\n\n` +
//             `${market.description}\n\n` +
//             `📊 Current Probabilities:\n${priceStr}\n\n` +
//             `💰 Volume: $${parseFloat(market.volume).toLocaleString()}\n` +
//             `⏰ Ends: ${new Date(market.endDate).toLocaleDateString()}\n\n` +
//             `[View on Polymarket](${market.url})`;

//         await bot.sendMessage(chatId, message, {
//             parse_mode: 'Markdown',
//             disable_web_page_preview: true
//         });
//     } catch (error) {
//         console.error('Error in handleMarketDetails:', error);
//         await bot.sendMessage(chatId, 
//             "Sorry, there was an error fetching market details. Please try again later."
//         );
//     }
// }
