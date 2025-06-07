import { prisma } from '../config/database';
import { PolymarketService } from './polymarket-service';
import { RateLimiter } from 'limiter';

interface PolymarketResponse {
    limit: number;
    count: number;
    next_cursor: string;
    data: any[];
}

export class MarketSyncService {
    private polymarketService: PolymarketService;
    private rateLimiter: RateLimiter;

    constructor() {
        this.polymarketService = new PolymarketService();
        // 50 requests per 10 seconds = 5 requests per second
        this.rateLimiter = new RateLimiter({
            tokensPerInterval: 50,
            interval: 10000, // 10 seconds
        });
    }

    private async waitForRateLimit(): Promise<void> {
        await this.rateLimiter.removeTokens(1);
    }

    private async saveCursor(cursor: string | null): Promise<void> {
        await prisma.syncState.upsert({
            where: { id: 'polymarket' },
            create: {
                id: 'polymarket',
                cursor: cursor || '',
            },
            update: {
                cursor: cursor || '',
            },
        });
    }

    private async getCursor(): Promise<string | undefined> {
        const state = await prisma.syncState.findUnique({
            where: { id: 'polymarket' },
        });
        return state?.cursor;
    }

    private async processMarket(market: any): Promise<void> {
        await prisma.polymarketMarket.upsert({
            where: { conditionId: market.condition_id },
            create: {
                conditionId: market.condition_id,
                questionId: market.question_id,
                question: market.question,
                description: market.description || '',
                marketSlug: market.market_slug,
                category: market.category,
                fpmm: market.fpmm,
                endDate: new Date(market.end_date_iso),
                gameStartTime: market.game_start_time ? new Date(market.game_start_time) : null,
                secondsDelay: market.seconds_delay || 0,
                minimumOrderSize: parseInt(market.minimum_order_size) || 15,
                minimumTickSize: parseFloat(market.minimum_tick_size) || 0.01,
                minIncentiveSize: market.min_incentive_size,
                maxIncentiveSpread: market.max_incentive_spread,
                tokens: market.tokens || [],
                rewards: market.rewards || null,
                active: market.active || false,
                closed: market.closed || false,
                icon: market.icon || market.image,
                archived: market.archived || false,
                acceptingOrders: market.accepting_orders || false,
                acceptingOrderTimestamp: market.accepting_order_timestamp ? new Date(market.accepting_order_timestamp) : null,
                notificationsEnabled: market.notifications_enabled || false,
                negRisk: market.neg_risk || false,
                negRiskMarketId: market.neg_risk_market_id || null,
                negRiskRequestId: market.neg_risk_request_id || null,
                is5050Outcome: market.is_50_50_outcome || false,
            },
            update: {
                question: market.question,
                description: market.description || '',
                category: market.category,
                fpmm: market.fpmm,
                endDate: new Date(market.end_date_iso),
                gameStartTime: market.game_start_time ? new Date(market.game_start_time) : null,
                secondsDelay: market.seconds_delay || 0,
                minimumOrderSize: parseInt(market.minimum_order_size) || 15,
                minimumTickSize: parseFloat(market.minimum_tick_size) || 0.01,
                minIncentiveSize: market.min_incentive_size,
                maxIncentiveSpread: market.max_incentive_spread,
                tokens: market.tokens || [],
                rewards: market.rewards || null,
                active: market.active || false,
                closed: market.closed || false,
                icon: market.icon || market.image,
                archived: market.archived || false,
                acceptingOrders: market.accepting_orders === "true" || false,
                acceptingOrderTimestamp: market.accepting_order_timestamp ? new Date(market.accepting_order_timestamp) : null,
                notificationsEnabled: market.notifications_enabled || false,
                negRisk: market.neg_risk || false,
                negRiskMarketId: market.neg_risk_market_id || null,
                negRiskRequestId: market.neg_risk_request_id || null,
                is5050Outcome: market.is_50_50_outcome || false,
            },
        });
    }

    public async syncMarkets(): Promise<void> {
        let cursor = await this.getCursor();
        let hasMore = true;

        while (hasMore) {
            try {
                await this.waitForRateLimit();
                
                const response: PolymarketResponse = await this.polymarketService.getMarkets(cursor);
                
                console.log(`Processing ${response.count} markets...`);
                
                for (const market of response.data) {
                    await this.processMarket(market);
                }

                // Update cursor and check if we have more data
                cursor = response.next_cursor;
                hasMore = cursor !== 'LTE=' && cursor !== '';
                
                await this.saveCursor(cursor);
                
                console.log(`Processed batch. Next cursor: ${cursor}`);
            } catch (error) {
                console.error('Error processing markets:', error);
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
} 