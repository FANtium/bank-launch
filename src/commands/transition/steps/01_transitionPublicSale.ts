import { transitionV2 } from '@metaplex-foundation/genesis';
import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox';
import { type Context, type PublicKey, publicKey } from '@metaplex-foundation/umi';
import { WSOL_MINT } from '@/constants/token';
import type { StepResult } from '@/lib/pipeline/types';
import type { CommonBucketParams } from '@/types/CommonBucketParams';

type TransitionPublicSaleOptions = CommonBucketParams & {
	buckets: {
		publicSaleLaunchPoolBucket: PublicKey;
		publicSaleUnlockedBucket: PublicKey;
		raydiumCpmmBucket: PublicKey;
	};
};

/**
 * @see https://developers.metaplex.com/smart-contracts/genesis/launch-pool#executing-transitions
 */
export default function transitionPublicSale(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: TransitionPublicSaleOptions,
): StepResult {
	const {
		buckets: {
			publicSaleLaunchPoolBucket: launchPoolBucket,
			publicSaleUnlockedBucket: unlockedBucket,
			raydiumCpmmBucket,
		},
		...common
	} = options;

	const unlockedBucketQuoteTokenAccount = findAssociatedTokenPda(context, {
		owner: unlockedBucket,
		mint: WSOL_MINT,
	});

	const raydiumCpmmBucketQuoteTokenAccount = findAssociatedTokenPda(context, {
		owner: raydiumCpmmBucket,
		mint: WSOL_MINT,
	});

	const remainingAccounts = [
		unlockedBucket,
		unlockedBucketQuoteTokenAccount,
		raydiumCpmmBucket,
		raydiumCpmmBucketQuoteTokenAccount,
	].map((pubkey) => ({
		pubkey: publicKey(pubkey),
		isWritable: true,
		isSigner: false,
	}));

	return {
		description: 'Transition to public sale launchpool bucket',
		builder: transitionV2(context, { ...common, primaryBucket: launchPoolBucket }).addRemainingAccounts(
			remainingAccounts,
		),
	};
}
