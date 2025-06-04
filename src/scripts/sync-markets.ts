import { MarketSyncService } from '../services/market-sync-service';

async function main() {
    const syncService = new MarketSyncService();
    
    console.log('Starting market sync...');
    await syncService.syncMarkets();
    console.log('Market sync completed.');
}

main().catch(error => {
    console.error('Error running market sync:', error);
    process.exit(1);
}); 