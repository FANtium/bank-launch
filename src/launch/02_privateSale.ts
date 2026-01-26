import { addUnlockedBucketV2 } from '@metaplex-foundation/genesis';
import type { Context } from '@metaplex-foundation/umi';
import type { AddUnlockedBucketV2Params } from '@/types/AddUnlockedBucketV2Params';
import type { BuilderWithDescription } from '@/types/BuilderWithDescription';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import type { SetOptional } from '@/types/SetOptional';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type PrivateSaleOptions = CommonBucketParams & {
	unlockedBucket: SetOptional<AddUnlockedBucketV2Params, 'bucketIndex' | 'recipient'>;

	timeline: {
		claimStart: Date;
		claimEnd: Date;
	};
};

export default function privateSale(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: PrivateSaleOptions,
): BuilderWithDescription[] {
	const {
		timeline: { claimStart, claimEnd },
		unlockedBucket,
		...common
	} = options;

	return [
		{
			description: 'Add private sale unlocked bucket',
			builder: addUnlockedBucketV2(context, {
				...common,
				baseTokenAllocation: supplyShareBps(1000), // 10% of the total supply
				claimStartCondition: timeAbsolute(claimStart),
				claimEndCondition: timeAbsolute(claimEnd),
				...unlockedBucket,
			}),
		},
	];
}
