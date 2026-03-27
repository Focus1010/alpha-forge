import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

interface TransactionEvent {
  wallet: string;
  txHash: string;
  value: string;
  block: number;
  timestamp: number;
  type: 'transfer';
}

export class TrackerAgent {
  private provider: ethers.JsonRpcProvider | null = null;
  private watchedWallets: string[] = [];
  private isRunning: boolean = false;

  async init(rpcUrl?: string): Promise<void> {
    const url = rpcUrl || process.env.RPC_URL;
    if (!url) {
      throw new Error('RPC_URL is required. Set it in .env or pass as parameter.');
    }

    this.provider = new ethers.JsonRpcProvider(url);
    
    // Test connection
    try {
      const network = await this.provider.getNetwork();
      console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    } catch (error) {
      throw new Error(`Failed to connect to RPC: ${error}`);
    }
  }

  setWatchedWallets(wallets: string[]): void {
    this.watchedWallets = wallets.map(wallet => wallet.toLowerCase());
    console.log(`Watching ${this.watchedWallets.length} wallets:`, this.watchedWallets);
  }

  async run(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized. Call init() first.');
    }

    if (this.watchedWallets.length === 0) {
      throw new Error('No wallets to watch. Use setWatchedWallets() first.');
    }

    this.isRunning = true;
    console.log('Starting transaction tracking...');

    this.provider.on('block', async (blockNumber) => {
      if (!this.isRunning) return;

      try {
        await this.processBlock(blockNumber);
      } catch (error) {
        console.error(`Error processing block ${blockNumber}:`, error);
      }
    });

    console.log('Tracker agent is now listening for new blocks...');
  }

  private async processBlock(blockNumber: number): Promise<void> {
    if (!this.provider) return;

    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block || !block.transactions) return;

      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue;

        const transaction = tx as ethers.TransactionResponse;
        const fromAddress = transaction.from?.toLowerCase();
        const toAddress = transaction.to?.toLowerCase();

        const matchedWallet = this.watchedWallets.find(wallet => 
          wallet === fromAddress || wallet === toAddress
        );

        if (matchedWallet) {
          const event: TransactionEvent = {
            wallet: matchedWallet,
            txHash: transaction.hash,
            value: ethers.formatEther(transaction.value),
            block: blockNumber,
            timestamp: block.timestamp,
            type: 'transfer'
          };

          this.logEvent(event);
        }
      }
    } catch (error) {
      console.error(`Failed to process block ${blockNumber}:`, error);
    }
  }

  private logEvent(event: TransactionEvent): void {
    console.log('🔍 Transaction Event:', {
      wallet: event.wallet,
      txHash: event.txHash,
      value: `${event.value} ETH`,
      block: event.block,
      timestamp: new Date(event.timestamp * 1000).toISOString(),
      type: event.type
    });
  }

  stop(): void {
    this.isRunning = false;
    if (this.provider) {
      this.provider.removeAllListeners('block');
    }
    console.log('Tracker agent stopped.');
  }

  getWatchedWallets(): string[] {
    return [...this.watchedWallets];
  }

  isAgentRunning(): boolean {
    return this.isRunning;
  }
}
