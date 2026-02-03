import type { Context, PublicKey } from '@metaplex-foundation/umi';
import { getUnixTime } from 'date-fns/getUnixTime';
import addStreamflowBucket from '@/lib/metaplex/addStreamflowBucket';
import type { StepResult } from '@/lib/pipeline/types';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type TreasuryOptions = CommonBucketParams & {
	bucketIndex: number;
	recipient: PublicKey;
	timeline: {
		vestingStart: Date;
		vestingEnd: Date;
	};
};

const TREASURY_BPS = 2000; // 20% of the total supply

export default function treasury(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: TreasuryOptions,
): StepResult {
	const {
		bucketIndex,
		recipient,
		timeline: { vestingStart, vestingEnd },
		...common
	} = options;

	return {
		description: 'Add treasury Streamflow bucket',
		builder: addStreamflowBucket(context, {
			...common,
			bucketIndex,
			recipient,
			baseTokenAllocation: supplyShareBps(TREASURY_BPS),
			config: {
				streamName: Buffer.from('Treasury Streamflow'),
				cliffAmount: supplyShareBps(TREASURY_BPS * 0.25), // 5% of the total supply (25% cliff)
				startDate: getUnixTime(vestingStart),
				endDate: getUnixTime(vestingEnd),
			},
			lockStartCondition: timeAbsolute(vestingStart),
			lockEndCondition: timeAbsolute(vestingEnd),
		}),
	};
}
