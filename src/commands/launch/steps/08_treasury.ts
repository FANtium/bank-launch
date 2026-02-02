import type { Context, PublicKey } from '@metaplex-foundation/umi';
import { getUnixTime } from 'date-fns/getUnixTime';
import addStreamflowBucketVX from '@/lib/metaplex/addStreamflowBucketVX';
import type { AddStreamflowBucketV2Params } from '@/lib/metaplex/types/AddStreamflowBucketV2Params';
import type { StepResult } from '@/lib/pipeline/types';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type TreasuryOptions = CommonBucketParams & {
	bucketIndex: number;
	recipient: PublicKey;
	streamflowConfig?: AddStreamflowBucketV2Params['config'];
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
		streamflowConfig,
		timeline: { vestingStart, vestingEnd },
		...common
	} = options;

	return {
		description: 'Add treasury Streamflow bucket',
		builder: addStreamflowBucketVX(context, {
			...common,
			bucketIndex,
			recipient,
			baseTokenAllocation: supplyShareBps(TREASURY_BPS),
			config: {
				streamName: Buffer.from('Treasury Streamflow'),
				cliffAmount: supplyShareBps(TREASURY_BPS * 0.25), // 5% of the total supply (25% cliff)
				startTime: getUnixTime(vestingStart),
				endTime: getUnixTime(vestingEnd),
				...streamflowConfig,
			},
			lockStartCondition: timeAbsolute(vestingStart),
			lockEndCondition: timeAbsolute(vestingEnd),
		}),
	};
}
