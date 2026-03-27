import { TrackerAgent } from '../agents/tracker';

async function main() {
  const tracker = new TrackerAgent();
  
  try {
    // Initialize with RPC URL from environment
    await tracker.init();
    
    // Set wallets to watch (example addresses - replace with actual ones)
    const wallets = [
      '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45', // Example wallet 1
      '0x8ba1f109551bD432803012645Hac136c',         // Example wallet 2
    ];
    
    tracker.setWatchedWallets(wallets);
    
    // Start tracking
    await tracker.run();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down tracker...');
      tracker.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\nShutting down tracker...');
      tracker.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start tracker:', error);
    process.exit(1);
  }
}

main().catch(console.error);
