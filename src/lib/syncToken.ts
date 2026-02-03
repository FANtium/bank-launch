import type { PublicKey } from '@metaplex-foundation/umi';
import type Cluster from '@/types/Cluster';

export default async function syncToken(cluster: Cluster, mint: PublicKey): Promise<void> {
	if (cluster === 'local') {
		return;
	}

	const baseURL = cluster === 'mainnet' ? 'https://fanstrike.fun' : 'https://devnet.fanstrike.fun';
	const syncURL = `${baseURL}/api/tokens/${mint}/sync`;

	const response = await fetch(syncURL, { method: 'POST' });
	if (!response.ok) {
		throw new Error(`Failed to sync token: ${response.status} ${response.statusText}`);
	}
}
