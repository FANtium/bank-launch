import type { PublicKey } from '@metaplex-foundation/umi';
import pRetry, { AbortError } from 'p-retry';
import globalLogger from '@/lib/logging/globalLogger';
import type Cluster from '@/types/Cluster';

export default async function syncToken(cluster: Cluster, mint: PublicKey): Promise<void> {
	if (cluster === 'local') {
		return;
	}

	const baseURL = cluster === 'mainnet' ? 'https://fanstrike.fun' : 'http://localhost:3000';
	const syncURL = `${baseURL}/api/tokens/${mint}/sync`;

	await pRetry(
		async () => {
			const response = await fetch(syncURL, { method: 'POST' });
			if (response.status >= 500) {
				throw new Error(`Server error: ${response.status} ${response.statusText}`);
			}
			if (!response.ok) {
				throw new AbortError(`Failed to sync token: ${response.status} ${response.statusText}`);
			}
		},
		{
			retries: 5,
			onFailedAttempt: (error) => {
				globalLogger.info(`Sync attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
			},
		},
	);
}
