import type { Context, PublicKey } from '@metaplex-foundation/umi';
import { getUnixTime } from 'date-fns/getUnixTime';
import addStreamflowBucket from '@/lib/metaplex/addStreamflowBucket';
import type { StepResult } from '@/lib/pipeline/types';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type MarketingOptions = CommonBucketParams & {
	bucketIndex: number;
	recipient: PublicKey;
	timeline: {
		vestingStart: Date;
		vestingEnd: Date;
	};
};

const MARKETING_BPS = 1500; // 15% of the total supply

export default function marketing(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: MarketingOptions,
): StepResult {
	const {
		bucketIndex,
		recipient,
		timeline: { vestingStart, vestingEnd },
		...common
	} = options;

	return {
		description: 'Add marketing Streamflow bucket',
		builder: addStreamflowBucket(context, {
			...common,
			bucketIndex,
			recipient,
			baseTokenAllocation: supplyShareBps(MARKETING_BPS), // 11.25% of the total supply (75% of the 15% marketing allocation)
			config: {
				streamName: Buffer.from('Marketing Streamflow'),
				cliffAmount: supplyShareBps(MARKETING_BPS * 0.25), // 3.75% of the total supply (25% cliff)
				startDate: getUnixTime(vestingStart),
				endDate: getUnixTime(vestingEnd),
			},
			// Use a timestamp in the past so the lock can start immediately
			lockStartCondition: timeAbsolute(vestingStart), // Epoch time (1970-01-01) - always in the past
			lockEndCondition: timeAbsolute(vestingEnd),
		}),
	};
}
