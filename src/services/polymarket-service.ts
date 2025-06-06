import { Chain, ClobClient } from "@polymarket/clob-client";
import { prisma } from '../config/database';
import { PolymarketMarket } from '@prisma/client';


export class PolymarketService {
    private readonly baseUrl = 'https://clob.polymarket.com';
    private readonly graphqlUrl = 'https://gamma-api.polymarket.com/query';
    private readonly chainId = parseInt(`${process.env.CHAIN_ID || Chain.AMOY}`) as Chain;
    private client: ClobClient;

    constructor() {
        this.client = new ClobClient(this.baseUrl, this.chainId);;
    }

    async searchMarkets(query: string, options: {limit: number}): Promise<PolymarketMarket[]> {
        const markets = await prisma.polymarketMarket.findMany({
            where: {
                description: {
                    contains: query,
                },
                active: true,
                acceptingOrders: true,
                closed: false,
            },
            take: options.limit,
        });

        return markets;
    }

   async runTest() {
    const host = this.baseUrl;
    const chainId = parseInt(`${process.env.CHAIN_ID || Chain.AMOY}`) as Chain;
    const clobClient = new ClobClient(host, chainId);

    console.log("market", await clobClient.getMarket("condition_id"));

    console.log("markets", await clobClient.getMarkets());

    console.log("simplified markets", await clobClient.getSimplifiedMarkets());

    console.log("sampling markets", await clobClient.getSamplingMarkets());

    console.log("sampling simplified markets", await clobClient.getSamplingSimplifiedMarkets());
    }



    // async getMarketDetails(marketId: string): Promise<PolymarketMarket | null> {
    //     try {
    //         const response = await axios.post(this.graphqlUrl, {
    //             query: `
    //                 query GetMarket($id: ID!) {
    //                     market(id: $id) {
    //                         id
    //                         question
    //                         description
    //                         volume
    //                         outcomes
    //                         endTimestamp
    //                         prices
    //                     }
    //                 }
    //             `,
    //             variables: {
    //                 id: marketId
    //             }
    //         });

    //         const market = response.data.data?.market;
    //         if (!market) {
    //             return null;
    //         }

    //         return {
    //             id: market.id,
    //             question: market.question,
    //             description: market.description,
    //             volume: market.volume,
    //             url: `https://polymarket.com/event/${market.id}`,
    //             endDate: new Date(parseInt(market.endTimestamp) * 1000).toISOString(),
    //             outcomes: market.outcomes,
    //             prices: market.prices
    //         };
    //     } catch (error) {
    //         console.error('Error getting market details:', error);
    //         throw new Error('Failed to get market details');
    //     }
    // }

    async getMarkets(cursor?: string | undefined): Promise<{
        limit: number;
        count: number;
        next_cursor: string;
        data: any[];
    }> {
        return this.client.getMarkets(cursor);
    }

    async getMarket(marketId: string): Promise<PolymarketMarket | null> {
        const market = await prisma.polymarketMarket.findUnique({
            where: {
                id: marketId
            },
            select: {
                conditionId: true
            }
        });

        if (!market) {
            return null;
        }

        return this.client.getMarket(market.conditionId);
    }
    
    
} 