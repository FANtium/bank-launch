import { addUnlockedBucketV2 } from '@metaplex-foundation/genesis';
import type { Context, PublicKey } from '@metaplex-foundation/umi';
import { getUnixTime } from 'date-fns/getUnixTime';
import addStreamflowBucketVX from '@/lib/metaplex/addStreamflowBucketVX';
import type { AddStreamflowBucketV2Params } from '@/lib/metaplex/types/AddStreamflowBucketV2Params';
import type { AddUnlockedBucketV2Params } from '@/lib/metaplex/types/AddUnlockedBucketV2Params';
import type { StepResult } from '@/lib/pipeline/types';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import type { SetOptional } from '@/types/SetOptional';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type MarketingStreamflowOptions = CommonBucketParams & {
	mode: 'streamflow';
	bucketIndex: number;
	recipient: PublicKey;
	streamflowConfig?: AddStreamflowBucketV2Params['config'];
	timeline: {
		vestingStart: Date;
		vestingEnd: Date;
	};
};

type MarketingUnlockedOptions = CommonBucketParams & {
	mode: 'unlocked';
	bucketIndex: number;
	recipient: PublicKey;
	unlockedConfig?: Partial<SetOptional<AddUnlockedBucketV2Params, 'bucketIndex' | 'recipient'>>;
	timeline: {
		claimStart: Date;
		claimEnd: Date;
	};
};

type MarketingOptions = MarketingStreamflowOptions | MarketingUnlockedOptions;

const MARKETING_BPS = 1500; // 15% of the total supply

export default function marketing(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: MarketingOptions,
): StepResult {
	if (options.mode === 'unlocked') {
		const {
			bucketIndex,
			recipient,
			unlockedConfig,
			timeline: { claimStart, claimEnd },
			...common
		} = options;

		return {
			description: 'Add marketing unlocked bucket',
			builder: addUnlockedBucketV2(context, {
				...common,
				bucketIndex,
				recipient,
				baseTokenAllocation: supplyShareBps(MARKETING_BPS),
				claimStartCondition: timeAbsolute(claimStart),
				claimEndCondition: timeAbsolute(claimEnd),
				...unlockedConfig,
			}),
		};
	}

	// Streamflow mode
	const {
		bucketIndex,
		recipient,
		streamflowConfig,
		timeline: { vestingStart, vestingEnd },
		...common
	} = options;

	return {
		description: 'Add marketing Streamflow bucket',
		builder: addStreamflowBucketVX(context, {
			...common,
			bucketIndex,
			recipient,
			baseTokenAllocation: supplyShareBps(MARKETING_BPS), // 11.25% of the total supply (75% of the 15% marketing allocation)
			config: {
				streamName: Buffer.from('Marketing Streamflow'),
				cliffAmount: supplyShareBps(MARKETING_BPS * 0.25), // 3.75% of the total supply (25% cliff)
				startTime: getUnixTime(vestingStart),
				endTime: getUnixTime(vestingEnd),
				...streamflowConfig,
			},
			lockStartCondition: timeAbsolute(vestingStart),
			lockEndCondition: timeAbsolute(vestingEnd),
		}),
	};
}
