import {
	findLaunchPoolBucketV2Pda,
	findRaydiumCpmmBucketV2Pda,
	findStreamflowBucketV2Pda,
	findUnlockedBucketV2Pda,
} from '@metaplex-foundation/genesis';
import type { Context, PublicKey } from '@metaplex-foundation/umi';
import BucketCounter from '../lib/metaplex/BucketCounter';

type BucketType = 'unlocked' | 'launchPool' | 'raydiumCpmm' | 'streamflow';

export default function getBuckets(context: Pick<Context, 'eddsa' | 'programs'>, genesisAccount: PublicKey) {
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
	const [raydiumCpmmBucket] = findRaydiumCpmmBucketV2Pda(context, {
		genesisAccount,
		bucketIndex: raydiumCpmmBucketIndex,
	});

	// Bankroll
	const bankrollUnlockedBucketIndex = bucketCounter.get('unlocked');
	const [bankrollUnlockedBucket] = findUnlockedBucketV2Pda(context, {
		genesisAccount,
		bucketIndex: bankrollUnlockedBucketIndex,
	});

	// Marketing and collaborations
	const marketingBucketIndex = bucketCounter.get('streamflow');
	const [marketingBucket] = findStreamflowBucketV2Pda(context, {
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
	const treasuryBucketIndex = bucketCounter.get('streamflow');
	const [treasuryBucket] = findStreamflowBucketV2Pda(context, {
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
		raydiumCpmmBucket,

		bankrollUnlockedBucketIndex,
		bankrollUnlockedBucket,

		marketingBucketIndex,
		marketingBucket,

		liquidityManagementUnlockedBucketIndex,
		liquidityManagementUnlockedBucket,

		treasuryBucketIndex,
		treasuryBucket,
	};
}
