import { addLaunchPoolBucketV2, addUnlockedBucketV2, behavior } from '@metaplex-foundation/genesis';
import type { Context, PublicKey } from '@metaplex-foundation/umi';
import { addHours } from 'date-fns/addHours';
import { getUnixTime } from 'date-fns/getUnixTime';
import type { AddLaunchPoolBucketV2Params } from '@/lib/metaplex/types/AddLaunchPoolBucketV2Params';
import type { AddUnlockedBucketV2Params } from '@/lib/metaplex/types/AddUnlockedBucketV2Params';
import type { StepResult } from '@/lib/pipeline/types';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import type { SetOptional } from '@/types/SetOptional';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type PublicSaleOptions = CommonBucketParams & {
	launchpoolBucket: Omit<SetOptional<AddLaunchPoolBucketV2Params, 'bucketIndex'>, 'penaltyWallet'> &
		Required<Pick<AddLaunchPoolBucketV2Params, 'penaltyWallet'>>;
	unlockedBucket: SetOptional<AddUnlockedBucketV2Params, 'bucketIndex' | 'recipient'>;

	buckets: {
		publicSaleUnlockedBucket: PublicKey;
		raydiumCpmmBucket: PublicKey;
	};

	timeline: {
		publicSaleStart: Date;
		publicSaleEnd: Date;
		claimStart: Date;
		claimEnd: Date;
	};
};

export default function publicSale(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: PublicSaleOptions,
): StepResult {
	const {
		launchpoolBucket,
		unlockedBucket,
		buckets,
		timeline: { publicSaleStart, publicSaleEnd, claimStart, claimEnd },
		...common
	} = options;

	return [
		{
			description: 'Add public sale unlocked bucket',
			builder: addUnlockedBucketV2(context, {
				...common,
				baseTokenAllocation: supplyShareBps(0),
				claimStartCondition: timeAbsolute(claimStart),
				claimEndCondition: timeAbsolute(claimEnd),
				...unlockedBucket,
			}),
		},
		{
			description: 'Add public sale launch pool bucket',
			builder: addLaunchPoolBucketV2(context, {
				...common,
				baseTokenAllocation: supplyShareBps(500), // 5% of the total supply

				// 25% bonus at publicSaleStart, decreasing linearly to 0% over 24h
				bonusSchedule: {
					maxBps: 2500, // capped at 25%
					interceptBps: 7500, // starts at 75% but everything capped at 25%
					slopeBps: -10000, // this large negative slope makes it hit 0 at t=36 hours
					startTime: getUnixTime(publicSaleStart),
					endTime: getUnixTime(addHours(publicSaleStart, 24)),
				},

				withdrawPenalty: {
					maxBps: 10000, // capped at 100% but wasn't used, could have still been 25%
					interceptBps: -7500, // starts at -75% but everything capped at 0%
					slopeBps: 10000, // this large positive slope makes it hit 0 at t=36 hours
					startTime: getUnixTime(publicSaleStart),
					endTime: getUnixTime(addHours(publicSaleStart, 48)),
				},

				// Optional: Deposit limits
				minimumDepositAmount: null, // or { amount: sol(0.1).basisPoints }
				depositLimit: null, // or { limit: sol(10).basisPoints }

				// Timing
				depositStartCondition: timeAbsolute(publicSaleStart),
				depositEndCondition: timeAbsolute(publicSaleEnd),
				claimStartCondition: timeAbsolute(claimStart),
				claimEndCondition: timeAbsolute(claimEnd),

				// Where collected SOL goes after transition
				endBehaviors: [
					// 80% to unlocked bucket
					behavior('SendQuoteTokenPercentage', {
						padding: Array(4).fill(0),
						destinationBucket: buckets.publicSaleUnlockedBucket,
						percentageBps: 8000, // 80%
						processed: false,
					}),

					// 20% to Raydium CPMM bucket
					behavior('SendQuoteTokenPercentage', {
						padding: Array(4).fill(0),
						destinationBucket: buckets.raydiumCpmmBucket,
						percentageBps: 2000, // 20%
						processed: false,
					}),
				],

				...launchpoolBucket,
			}),
		},
	];
}
