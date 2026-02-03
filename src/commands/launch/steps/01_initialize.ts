import { initializeV2 } from '@metaplex-foundation/genesis';
import type { Context, Signer } from '@metaplex-foundation/umi';
import { BANK_DECIMALS, BANK_TOTAL_SUPPLY, WSOL_MINT } from '@/constants/token';
import type { StepResult } from '@/lib/pipeline/types';
import type Cluster from '@/types/Cluster';
import type { CommonBucketParams } from '@/types/CommonBucketParams';

type InitializeOptions = Omit<CommonBucketParams, 'baseMint'> & {
	cluster: Cluster;
	baseMint: Signer;
};

export default function initialize(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	{ cluster, ...options }: InitializeOptions,
): StepResult {
	const { name, symbol, uri } = (() => {
		if (cluster === 'mainnet') {
			return {
				name: 'Bank Token',
				symbol: 'BANK',
				uri: 'https://fanstrike.fun/bank',
			};
		}

		const prefix = options.baseMint.publicKey.slice(0, 4).toString();
		return {
			name: `TBank Token ${prefix}`,
			symbol: `TBANK-${prefix}`,
			uri: `https://devnet.fanstrike.fun/coin/${options.baseMint.publicKey}`,
		};
	})();

	return {
		description: 'Initialize bank token',
		builder: initializeV2(context, {
			...options,
			quoteMint: WSOL_MINT,
			fundingMode: 0,
			totalSupplyBaseToken: BANK_TOTAL_SUPPLY,

			name,
			symbol,
			uri,
			decimals: BANK_DECIMALS,
		}),
	};
}
