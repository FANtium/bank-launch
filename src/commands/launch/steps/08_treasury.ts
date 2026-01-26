import type { Context } from '@metaplex-foundation/umi';
import { getUnixTime } from 'date-fns/getUnixTime';
import addStreamflowBucketVX from '@/lib/addStreamflowBucketVX';
import type { AddStreamflowBucketV2Params } from '@/types/AddStreamflowBucketV2Params';
import type { BuilderWithDescription } from '@/types/BuilderWithDescription';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import type { SetOptional } from '@/types/SetOptional';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type TreasuryOptions = CommonBucketParams & {
	streamflowBucket: SetOptional<AddStreamflowBucketV2Params, 'bucketIndex' | 'recipient'>;

	timeline: {
		vestingStart: Date;
		vestingEnd: Date;
	};
};

export default function treasury(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: TreasuryOptions,
): BuilderWithDescription[] {
	const {
		streamflowBucket: { config: streamflowConfig, ...streamflowBucket },
		timeline: { vestingStart, vestingEnd },
		...common
	} = options;

	const treasuryBps = 2000; // 20% of the total supply

	return [
		{
			description: 'Add treasury Streamflow bucket',
			builder: addStreamflowBucketVX(context, {
				...common,
				baseTokenAllocation: supplyShareBps(treasuryBps), // 15% of the total supply
				config: {
					streamName: Buffer.from('Treasury Streamflow'),
					cliffAmount: supplyShareBps(treasuryBps * 0.25), // 5% of the total supply (25% cliff)
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
