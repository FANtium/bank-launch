import { deriveRaydiumPDAsV2, graduateToRaydiumCpmmV2 } from '@metaplex-foundation/genesis';
import type { PublicKey, Umi } from '@metaplex-foundation/umi';
import type { StepResult } from '@/lib/pipeline/types';
import type Cluster from '@/types/Cluster';
import type { CommonBucketParams } from '@/types/CommonBucketParams';

type GraduateRaydiumCpmmOptions = Omit<CommonBucketParams, 'backendSigner'> & {
	cluster: Cluster;
	buckets: {
		raydiumCpmmBucket: PublicKey;
	};
};

/**
 * @see https://developers.metaplex.com/smart-contracts/genesis/launch-pool#executing-transitions
 */
export default function graduateRaydiumCpmm(context: Umi, options: GraduateRaydiumCpmmOptions): StepResult {
	const {
		buckets: { raydiumCpmmBucket },
		cluster,
		baseMint,
		...common
	} = options;

	// Derive all Raydium pool accounts from the base mint
	const raydiumAccounts = deriveRaydiumPDAsV2(context, baseMint, {
		env: cluster === 'mainnet' ? 'mainnet' : 'devnet',
	});

	return {
		description: 'Graduate Raydium CPMM bucket to create liquidity pool',
		builder: graduateToRaydiumCpmmV2(context, {
			...common,
			baseMint,
			bucket: raydiumCpmmBucket,
			...raydiumAccounts,
		}),
	};
}
