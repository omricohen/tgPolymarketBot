import { ClobClient, Side, ApiKeyCreds, OpenOrder, Chain } from '@polymarket/clob-client';
import { Wallet } from "@ethersproject/wallet";
import { JsonRpcProvider } from "@ethersproject/providers";

export interface PolymarketConfig {
  host: string;
  privateKey: string;
  apiKey?: string | undefined;
  apiSecret?: string | undefined;
  passphrase?: string | undefined;
  chainId?: number | undefined;
}

export interface MarketInfo {
  id: string;
  question: string;
  description: string;
  outcomes: string[];
  tokenIds: string[];
  prices: number[];
  volume: number;
  endDate: Date;
  resolved: boolean;
  category: string;
}

export interface OrderRequest {
  marketId: string;
  outcome: string; // "YES" or "NO"
  side: 'BUY' | 'SELL';
  amount: number; // USD amount
  price: number; // Price between 0 and 1
}

export interface OrderResult {
  orderId: string;
  status: 'SUCCESS' | 'FAILED';
  message: string;
  transactionHash?: string;
}

export interface BalanceInfo {
  usdc: number;
  positions: Array<{
    marketId: string;
    outcome: string;
    shares: number;
    value: number;
  }>;
}

interface BalanceAllowanceParams {
  assetType: 'COLLATERAL' | 'CONDITIONAL';
  tokenId?: string;
  userAddress: string;
}

interface SubgraphPosition {
  market: {
    id: string;
    question: string;
  };
  outcome: string;
  size: string;
  value: string;
}

interface SubgraphOrder {
  id: string;
  market: {
    id: string;
    question: string;
  };
  side: string;
  size: string;
  price: string;
  timestamp: string;
  status: string;
}

interface SubgraphResponse {
  data?: {
    account?: {
      positions?: SubgraphPosition[];
      collateralBalance?: string;
      orders?: SubgraphOrder[];
    };
  };
}

export interface OrderHistory {
  id: string;
  marketId: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  timestamp: number;
  status: string;
  question: string;
}

export class PolymarketIntegration {
  private client: ClobClient;
  private signer: Wallet;
  private config: PolymarketConfig;

  constructor(config: PolymarketConfig) {
    this.config = config;
    
    // Initialize provider and signer
    const provider = new JsonRpcProvider(
      config.chainId === Chain.POLYGON 
        ? "https://polygon-rpc.com" 
        : "https://polygon-mumbai.infura.io/v3/your-infura-id"
    );
    this.signer = new Wallet(config.privateKey, provider);
    
    // Initialize CLOB client with credentials
    const creds: ApiKeyCreds | undefined = config.apiKey ? {
      key: config.apiKey,
      secret: config.apiSecret!,
      passphrase: config.passphrase!,
    } : undefined;

    // Initialize client with chain ID and signer
    this.client = new ClobClient(
      config.host || "https://clob.polymarket.com",
      config.chainId || Chain.POLYGON, // Default to Polygon mainnet
      this.signer,
      creds
    );
  }

  /**
   * Search for markets based on query
   */
  async searchMarkets(query: string, limit: number = 10): Promise<MarketInfo[]> {
    try {
      const response = await this.client.getMarkets();
      const markets = response.data || [];
      
      // Filter markets based on query
      const filteredMarkets = markets
        .filter(market => 
          market.question.toLowerCase().includes(query.toLowerCase()) ||
          (market.description?.toLowerCase() || '').includes(query.toLowerCase())
        )
        .slice(0, limit);

      return filteredMarkets.map(market => ({
        id: market.id,
        question: market.question,
        description: market.description || '',
        outcomes: market.outcomes || ['YES', 'NO'],
        tokenIds: market.tokenIds || [],
        prices: market.prices || [],
        volume: market.volume || 0,
        endDate: new Date(market.endDate),
        resolved: market.resolved || false,
        category: market.category || 'Other'
      }));
    } catch (error) {
      console.error('Error searching markets:', error);
      throw new Error('Failed to search markets');
    }
  }

  /**
   * Get detailed market information
   */
  async getMarket(marketId: string): Promise<MarketInfo | null> {
    try {
      const market = await this.client.getMarket(marketId);
      if (!market) return null;

      return {
        id: market.id,
        question: market.question,
        description: market.description || '',
        outcomes: market.outcomes || ['YES', 'NO'],
        tokenIds: market.tokenIds || [],
        prices: market.prices || [],
        volume: market.volume || 0,
        endDate: new Date(market.endDate),
        resolved: market.resolved || false,
        category: market.category || 'Other'
      };
    } catch (error) {
      console.error('Error getting market:', error);
      return null;
    }
  }

  /**
   * Place a bet on a market
   */
  async placeBet(orderRequest: OrderRequest): Promise<OrderResult> {
    try {
      const market = await this.getMarket(orderRequest.marketId);
      if (!market) {
        return {
          orderId: '',
          status: 'FAILED',
          message: 'Market not found'
        };
      }

      if (market.resolved) {
        return {
          orderId: '',
          status: 'FAILED',
          message: 'Market is already resolved'
        };
      }

      // Find the token ID for the outcome
      const outcomeIndex = market.outcomes.findIndex(
        outcome => outcome.toUpperCase() === orderRequest.outcome.toUpperCase()
      );
      
      if (outcomeIndex === -1) {
        return {
          orderId: '',
          status: 'FAILED',
          message: `Invalid outcome. Available outcomes: ${market.outcomes.join(', ')}`
        };
      }

      const tokenID = market.tokenIds[outcomeIndex];
      if (!tokenID) {
        return {
          orderId: '',
          status: 'FAILED',
          message: 'Token ID not found for outcome'
        };
      }

      const side = orderRequest.side === 'BUY' ? Side.BUY : Side.SELL;
      
      // Calculate size based on amount and price
      const size = Math.floor(orderRequest.amount / orderRequest.price);

      // Create and sign the order
      const order = await this.client.createOrder({
        tokenID,
        price: orderRequest.price,
        side,
        size,
        feeRateBps: 0
      });

      // Post the order
      const response = await this.client.postOrder(order);

      return {
        orderId: response.orderId || '',
        status: response.success ? 'SUCCESS' : 'FAILED',
        message: response.success ? 'Order placed successfully' : response.error || 'Order failed',
        transactionHash: response.transactionHash
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        orderId: '',
        status: 'FAILED',
        message: `Failed to place bet: ${errorMessage}`
      };
    }
  }

  /**
   * Get user's balance and positions
   */
  async getBalance(): Promise<BalanceInfo> {
    try {
      const address = await this.signer.getAddress();
      
      // Get balance and positions from subgraph
      const query = `{
        account(id: "${address.toLowerCase()}") {
          collateralBalance
          positions {
            market {
              id
              question
            }
            outcome
            size
            value
          }
        }
      }`;

      const subgraphEndpoint = 'https://api.thegraph.com/subgraphs/name/polymarket/matic-markets';
      const response = await fetch(subgraphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await response.json() as SubgraphResponse;
      const positions = data?.data?.account?.positions || [];
      const usdcBalance = parseFloat(data?.data?.account?.collateralBalance || '0');

      const positionInfo = positions.map((position: SubgraphPosition) => ({
        marketId: position.market.id,
        outcome: position.outcome,
        shares: parseFloat(position.size),
        value: parseFloat(position.value)
      }));

      return {
        usdc: usdcBalance,
        positions: positionInfo
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      return {
        usdc: 0,
        positions: []
      };
    }
  }

  /**
   * Get trending markets
   */
  async getTrendingMarkets(limit: number = 10): Promise<MarketInfo[]> {
    try {
      const response = await this.client.getMarkets();
      const markets = response.data || [];
      
      // Sort by volume (descending) and take the top ones
      const trendingMarkets = markets
        .filter(market => !market.resolved)
        .sort((a, b) => (b.volume || 0) - (a.volume || 0))
        .slice(0, limit);

      return trendingMarkets.map(market => ({
        id: market.id,
        question: market.question,
        description: market.description || '',
        outcomes: market.outcomes || ['YES', 'NO'],
        tokenIds: market.tokenIds || [],
        prices: market.prices || [],
        volume: market.volume || 0,
        endDate: new Date(market.endDate),
        resolved: market.resolved || false,
        category: market.category || 'Other'
      }));
    } catch (error) {
      console.error('Error getting trending markets:', error);
      throw new Error('Failed to get trending markets');
    }
  }

  /**
   * Get order history for user
   */
  async getOrderHistory(limit: number = 20): Promise<OrderHistory[]> {
    try {
      const address = await this.signer.getAddress();
      const query = `{
        account(id: "${address.toLowerCase()}") {
          orders(first: ${limit}, orderBy: timestamp, orderDirection: desc) {
            id
            market {
              id
              question
            }
            side
            size
            price
            timestamp
            status
          }
        }
      }`;

      const subgraphEndpoint = 'https://api.thegraph.com/subgraphs/name/polymarket/matic-markets';
      const response = await fetch(subgraphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await response.json() as SubgraphResponse;
      const orders = data?.data?.account?.orders || [];

      return orders.map(order => ({
        id: order.id,
        marketId: order.market.id,
        side: order.side as 'BUY' | 'SELL',
        size: parseFloat(order.size),
        price: parseFloat(order.price),
        timestamp: parseInt(order.timestamp),
        status: order.status,
        question: order.market.question
      }));
    } catch (error) {
      console.error('Error getting order history:', error);
      return [];
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const response = await this.client.cancelOrder({ orderID: orderId });
      return response?.success || false;
    } catch (error) {
      console.error('Error canceling order:', error);
      return false;
    }
  }

  /**
   * Get market categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await this.client.getMarkets();
      const markets = response.data || [];
      const categories = [...new Set(markets
        .map(m => m.category)
        .filter((category): category is string => Boolean(category)))];
      return categories;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  /**
   * Get markets by category
   */
  async getMarketsByCategory(category: string, limit: number = 10): Promise<MarketInfo[]> {
    try {
      const response = await this.client.getMarkets();
      const markets = response.data || [];
      
      const categoryMarkets = markets
        .filter(market => 
          market.category?.toLowerCase() === category.toLowerCase() && 
          !market.resolved
        )
        .slice(0, limit);

      return categoryMarkets.map(market => ({
        id: market.id,
        question: market.question,
        description: market.description || '',
        outcomes: market.outcomes || ['YES', 'NO'],
        tokenIds: market.tokenIds || [],
        prices: market.prices || [],
        volume: market.volume || 0,
        endDate: new Date(market.endDate),
        resolved: market.resolved || false,
        category: market.category || 'Other'
      }));
    } catch (error) {
      console.error('Error getting markets by category:', error);
      throw new Error('Failed to get markets by category');
    }
  }

  /**
   * Format market info for display
   */
  formatMarketInfo(market: MarketInfo): string {
    const priceYes = market.prices[0] || 0;
    const priceNo = market.prices[1] || 0;
    
    return `📊 **${market.question}**
    
💰 **Prices:**
• YES: $${priceYes.toFixed(2)} (${(priceYes * 100).toFixed(0)}%)
• NO: $${priceNo.toFixed(2)} (${(priceNo * 100).toFixed(0)}%)

📈 **Volume:** $${market.volume.toLocaleString()}
⏰ **Ends:** ${market.endDate.toLocaleDateString()}
🏷️ **Category:** ${market.category}

${market.description ? `**Description:** ${market.description}` : ''}`;
  }

  /**
   * Format balance info for display
   */
  formatBalanceInfo(balance: BalanceInfo): string {
    let message = `💰 **Your Balance**\n\n`;
    message += `💵 **USDC:** $${balance.usdc.toFixed(2)}\n\n`;
    
    if (balance.positions.length > 0) {
      message += `📊 **Positions:**\n`;
      balance.positions.forEach(pos => {
        message += `- ${pos.outcome}: ${pos.shares} shares ($${pos.value.toFixed(2)})\n`;
      });
    } else {
      message += `📊 **Positions:** None`;
    }
    
    return message;
  }
}

// Example usage and configuration
export const createPolymarketClient = (config: Partial<PolymarketConfig> = {}): PolymarketIntegration => {
  const defaultConfig: PolymarketConfig = {
    host: process.env.POLYMARKET_HOST || "https://clob.polymarket.com",
    privateKey: process.env.PRIVATE_KEY || "",
    apiKey: process.env.POLYMARKET_API_KEY || undefined,
    apiSecret: process.env.POLYMARKET_API_SECRET || undefined,
    passphrase: process.env.POLYMARKET_PASSPHRASE || undefined,
    chainId: 137, // Polygon mainnet
  };

  return new PolymarketIntegration({...defaultConfig, ...config});
};