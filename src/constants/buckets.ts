import {
	findLaunchPoolBucketV2Pda,
	findRaydiumCpmmBucketV2Pda,
	findStreamflowBucketV2Pda,
	findUnlockedBucketV2Pda,
} from '@metaplex-foundation/genesis';
import type { Context, PublicKey } from '@metaplex-foundation/umi';
import BucketCounter from '../lib/BucketCounter';

type BucketType = 'unlocked' | 'launchPool' | 'raydiumCpmm' | 'streamflow';

type GetBucketsOptions = {
	noStreamflow?: boolean;
};

export default function getBuckets(
	context: Pick<Context, 'eddsa' | 'programs'>,
	genesisAccount: PublicKey,
	options: GetBucketsOptions = {},
) {
	const { noStreamflow = false } = options;
	const bucketCounter = new BucketCounter<BucketType>(['unlocked', 'launchPool', 'raydiumCpmm', 'streamflow']);

	// Private Sale
	const privateSaleUnlockedBucketIndex = bucketCounter.get('unlocked');
	const [privateSaleUnlockedBucket] = findUnlockedBucketV2Pda(context, {
		genesisAccount,
		bucketIndex: privateSaleUnlockedBucketIndex,
	});

	// Public Sale
	const publicSaleLaunchPoolBucketIndex = bucketCounter.get('launchPool');
	const [publicSaleLaunchPoolBucket] = findLaunchPoolBucketV2Pda(context, {
		genesisAccount,
		bucketIndex: publicSaleLaunchPoolBucketIndex,
	});

	// A part of the public sale is unlocked immediately, rest is sent to a liquidity pool
	const publicSaleUnlockedBucketIndex = bucketCounter.get('unlocked');
	const [publicSaleUnlockedBucket] = findUnlockedBucketV2Pda(context, {
		genesisAccount,
		bucketIndex: publicSaleUnlockedBucketIndex,
	});

	// Raydium CPMM bucket for liquidity mining and initial liquidity provision
	const raydiumCpmmBucketIndex = bucketCounter.get('raydiumCpmm');
	const [raydiumBucket] = findRaydiumCpmmBucketV2Pda(context, { genesisAccount, bucketIndex: raydiumCpmmBucketIndex });

	// Bankroll
	const bankrollUnlockedBucketIndex = bucketCounter.get('unlocked');
	const [bankrollUnlockedBucket] = findUnlockedBucketV2Pda(context, {
		genesisAccount,
		bucketIndex: bankrollUnlockedBucketIndex,
	});

	// Marketing and collaborations
	const marketingBucketIndex = noStreamflow ? bucketCounter.get('unlocked') : bucketCounter.get('streamflow');
	const [marketingBucket] = noStreamflow
		? findUnlockedBucketV2Pda(context, {
				genesisAccount,
				bucketIndex: marketingBucketIndex,
			})
		: findStreamflowBucketV2Pda(context, {
				genesisAccount,
				bucketIndex: marketingBucketIndex,
			});

	// Liquidity Management
	const liquidityManagementUnlockedBucketIndex = bucketCounter.get('unlocked');
	const [liquidityManagementUnlockedBucket] = findUnlockedBucketV2Pda(context, {
		genesisAccount,
		bucketIndex: liquidityManagementUnlockedBucketIndex,
	});

	// Treasury: 20%
	const treasuryBucketIndex = noStreamflow ? bucketCounter.get('unlocked') : bucketCounter.get('streamflow');
	const [treasuryBucket] = noStreamflow
		? findUnlockedBucketV2Pda(context, {
				genesisAccount,
				bucketIndex: treasuryBucketIndex,
			})
		: findStreamflowBucketV2Pda(context, {
				genesisAccount,
				bucketIndex: treasuryBucketIndex,
			});

	return {
		privateSaleUnlockedBucketIndex,
		privateSaleUnlockedBucket,

		publicSaleLaunchPoolBucketIndex,
		publicSaleLaunchPoolBucket,
		publicSaleUnlockedBucketIndex,
		publicSaleUnlockedBucket,

		raydiumCpmmBucketIndex,
		raydiumBucket,

		bankrollUnlockedBucketIndex,
		bankrollUnlockedBucket,

		marketingBucketIndex,
		marketingBucket,

		liquidityManagementUnlockedBucketIndex,
		liquidityManagementUnlockedBucket,

		treasuryBucketIndex,
		treasuryBucket,

		noStreamflow,
	};
}
