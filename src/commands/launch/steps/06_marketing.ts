import type { Context } from '@metaplex-foundation/umi';
import { getUnixTime } from 'date-fns/getUnixTime';
import addStreamflowBucketVX from '@/lib/addStreamflowBucketVX';
import type { AddStreamflowBucketV2Params } from '@/types/AddStreamflowBucketV2Params';
import type { BuilderWithDescription } from '@/types/BuilderWithDescription';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import type { SetOptional } from '@/types/SetOptional';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type MarketingOptions = CommonBucketParams & {
	streamflowBucket: SetOptional<AddStreamflowBucketV2Params, 'bucketIndex' | 'recipient'>;

	timeline: {
		vestingStart: Date;
		vestingEnd: Date;
	};
};

export default function marketing(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: MarketingOptions,
): BuilderWithDescription {
	const {
		streamflowBucket: { config: streamflowConfig, ...streamflowBucket },
		timeline: { vestingStart, vestingEnd },
		...common
	} = options;

	const marketingBps = 1500; // 15% of the total supply

	return {
		description: 'Add marketing Streamflow bucket',
		builder: addStreamflowBucketVX(context, {
			...common,
			baseTokenAllocation: supplyShareBps(marketingBps), // 11.25% of the total supply (75% of the 15% marketing allocation)
			config: {
				streamName: Buffer.from('Marketing Streamflow'),
				cliffAmount: supplyShareBps(marketingBps * 0.25), // 3.75% of the total supply (25% cliff)
				startTime: getUnixTime(vestingStart),
				endTime: getUnixTime(vestingEnd),
				...streamflowConfig,
			},
			lockStartCondition: timeAbsolute(vestingStart),
			lockEndCondition: timeAbsolute(vestingEnd),
			...streamflowBucket,
		}),
	};
}
