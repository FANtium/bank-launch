import { createHash } from 'node:crypto';
import { findGenesisAccountV2Pda } from '@metaplex-foundation/genesis';
import { type Context, createSignerFromKeypair } from '@metaplex-foundation/umi';
import initialize from '@/commands/launch/steps/01_initialize';
import privateSale from '@/commands/launch/steps/02_privateSale';
import publicSale from '@/commands/launch/steps/03_publicSale';
import raydiumCpmm from '@/commands/launch/steps/04_raydiumCpmm';
import bankroll from '@/commands/launch/steps/05_bankroll';
import marketing from '@/commands/launch/steps/06_marketing';
import liquidity from '@/commands/launch/steps/07_liquidity';
import treasury from '@/commands/launch/steps/08_treasury';
import finalize from '@/commands/launch/steps/09_finalize';
import getBuckets from '@/constants/buckets';
import { walletsMap } from '@/constants/wallets';
import getTimeline from '@/lib/getTimeline';
import globalLogger from '@/logging/globalLogger';
import type Cluster from '@/types/Cluster';

type GetLaunchStepsOptions = {
	cluster: Cluster;
	seed: string;
};

export default function getLaunchSteps(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs' | 'identity'>,
	options: GetLaunchStepsOptions,
) {
	const logger = globalLogger.getSubLogger({ name: 'getLaunchSteps' });
	const { cluster, seed } = options;
	logger.info(`Launching on cluster: ${cluster}`);

	// Hash the seed string to get exactly 32 bytes (SHA-256 output)
	const seed32 = createHash('sha256').update(seed).digest();
	const baseMint = createSignerFromKeypair(context, context.eddsa.createKeypairFromSeed(seed32));

	// Genesis account
	const [genesisAccount] = findGenesisAccountV2Pda(context, {
		baseMint: baseMint.publicKey,
		genesisIndex: 0,
	});

	const common = {
		baseMint: baseMint.publicKey,
		genesisAccount,
		backendSigner: {
			signer: context.identity.publicKey,
		},
	};

	// Buckets
	const bucket = getBuckets(context, genesisAccount);
	const timeline = getTimeline(new Date());
	const wallets = walletsMap[cluster];

	const steps = [
		initialize(context, { ...common, baseMint }),
		privateSale(context, {
			...common,
			unlockedBucket: {
				bucketIndex: bucket.privateSaleUnlockedBucketIndex,
				recipient: wallets.treasury,
			},
			timeline: {
				claimStart: timeline.claimStart,
				claimEnd: timeline.claimEnd,
			},
		}),
		publicSale(context, {
			...common,
			unlockedBucket: {
				bucketIndex: bucket.publicSaleUnlockedBucketIndex,
				recipient: wallets.treasury,
			},
			launchpoolBucket: {
				bucketIndex: bucket.publicSaleLaunchPoolBucketIndex,
				penaltyWallet: wallets.treasury,
			},
			timeline: {
				claimStart: timeline.claimStart,
				claimEnd: timeline.claimEnd,
				publicSaleStart: timeline.publicSaleStart,
				publicSaleEnd: timeline.publicSaleEnd,
			},
			buckets: {
				publicSaleUnlockedBucket: bucket.publicSaleUnlockedBucket,
				raydiumBucket: bucket.raydiumBucket,
			},
		}),
		raydiumCpmm(context, {
			...common,
			raydiumCpmm: {
				bucketIndex: bucket.raydiumCpmmBucketIndex,
			},
			timeline: {
				start: timeline.claimStart,
			},
		}),
		bankroll(context, {
			...common,
			unlockedBucket: {
				bucketIndex: bucket.bankrollUnlockedBucketIndex,
				recipient: wallets.bankroll,
			},
			timeline: {
				claimStart: timeline.claimStart,
				claimEnd: timeline.claimEnd,
			},
		}),
		marketing(context, {
			...common,
			streamflowBucket: {
				bucketIndex: bucket.marketingStreamflowBucketIndex,
				recipient: wallets.marketing,
			},
			timeline: {
				vestingStart: timeline.marketingVestingStart,
				vestingEnd: timeline.marketingVestingEnd,
			},
		}),
		liquidity(context, {
			...common,
			unlockedBucket: {
				bucketIndex: bucket.liquidityManagementUnlockedBucketIndex,
				recipient: wallets.liquidity,
			},
			timeline: {
				claimStart: timeline.claimStart,
				claimEnd: timeline.claimEnd,
			},
		}),
		treasury(context, {
			...common,
			streamflowBucket: {
				bucketIndex: bucket.treasuryStreamflowBucketIndex,
				recipient: wallets.treasury,
			},
			timeline: {
				vestingStart: timeline.treasuryVestingStart,
				vestingEnd: timeline.treasuryVestingEnd,
			},
		}),
		finalize(context, common),
	].flat();

	return steps;
}
