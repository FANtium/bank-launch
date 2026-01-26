import { addUnlockedBucketV2 } from '@metaplex-foundation/genesis';
import type { Context } from '@metaplex-foundation/umi';
import { getUnixTime } from 'date-fns/getUnixTime';
import addStreamflowBucketVX from '@/lib/addStreamflowBucketVX';
import type { AddStreamflowBucketV2Params } from '@/types/AddStreamflowBucketV2Params';
import type { AddUnlockedBucketV2Params } from '@/types/AddUnlockedBucketV2Params';
import type { BuilderWithDescription } from '@/types/BuilderWithDescription';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import type { SetOptional } from '@/types/SetOptional';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type TreasuryOptions = CommonBucketParams & {
	unlockedBucket: SetOptional<AddUnlockedBucketV2Params, 'bucketIndex' | 'recipient'>;
	streamflowBucket: SetOptional<AddStreamflowBucketV2Params, 'bucketIndex' | 'recipient'>;

	timeline: {
		claimStart: Date;
		claimEnd: Date;
		vestingStart: Date;
		vestingEnd: Date;
	};
};

export default function treasury(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: TreasuryOptions,
): BuilderWithDescription[] {
	const {
		unlockedBucket,
		streamflowBucket: { config: streamflowConfig, ...streamflowBucket },
		timeline: { claimStart, claimEnd, vestingStart, vestingEnd },
		...common
	} = options;

	return [
		{
			description: 'Add treasury unlocked bucket',
			builder: addUnlockedBucketV2(context, {
				...common,
				baseTokenAllocation: supplyShareBps(500), // 5% of the total supply
				claimStartCondition: timeAbsolute(claimStart),
				claimEndCondition: timeAbsolute(claimEnd),
				...unlockedBucket,
			}),
		},
		{
			description: 'Add treasury Streamflow bucket',
			builder: addStreamflowBucketVX(context, {
				...common,
				baseTokenAllocation: supplyShareBps(1500), // 15% of the total supply
				config: {
					streamName: Buffer.from('Treasury Streamflow'),
					startTime: getUnixTime(vestingStart),
					endTime: getUnixTime(vestingEnd),
					...streamflowConfig,
				},
				lockStartCondition: timeAbsolute(vestingStart),
				lockEndCondition: timeAbsolute(vestingEnd),
				...streamflowBucket,
			}),
		},
	];
}
