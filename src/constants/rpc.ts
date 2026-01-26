import type Cluster from '@/types/Cluster';

export const defaultRpcURLs: Record<Cluster, string> = {
	local: 'http://127.0.0.1:8899',
	devnet: 'https://api.devnet.solana.com',
	mainnet: 'https://api.mainnet-beta.solana.com',
};
