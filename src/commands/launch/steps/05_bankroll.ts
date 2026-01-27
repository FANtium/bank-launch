import { addUnlockedBucketV2 } from '@metaplex-foundation/genesis';
import type { Context } from '@metaplex-foundation/umi';
import type { AddUnlockedBucketV2Params } from '@/lib/metaplex/types/AddUnlockedBucketV2Params';
import type { StepResult } from '@/lib/pipeline/types';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import type { SetOptional } from '@/types/SetOptional';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type BankrollOptions = CommonBucketParams & {
	unlockedBucket: SetOptional<AddUnlockedBucketV2Params, 'bucketIndex' | 'recipient'>;

	timeline: {
		claimStart: Date;
		claimEnd: Date;
	};
};

export default function bankroll(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: BankrollOptions,
): StepResult {
	const {
		unlockedBucket,
		timeline: { claimStart, claimEnd },
		...common
	} = options;

	return {
		description: 'Add bankroll unlocked bucket',
		builder: addUnlockedBucketV2(context, {
			...common,
			baseTokenAllocation: supplyShareBps(2500), // 25% of the total supply
			claimStartCondition: timeAbsolute(claimStart),
			claimEndCondition: timeAbsolute(claimEnd),
			...unlockedBucket,
		}),
	};
}
