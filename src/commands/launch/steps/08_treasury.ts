import { addUnlockedBucketV2 } from '@metaplex-foundation/genesis';
import type { Context, PublicKey } from '@metaplex-foundation/umi';
import { getUnixTime } from 'date-fns/getUnixTime';
import addStreamflowBucketVX from '@/lib/addStreamflowBucketVX';
import type { AddStreamflowBucketV2Params } from '@/types/AddStreamflowBucketV2Params';
import type { AddUnlockedBucketV2Params } from '@/types/AddUnlockedBucketV2Params';
import type { BuilderWithDescription } from '@/types/BuilderWithDescription';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import type { SetOptional } from '@/types/SetOptional';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type TreasuryStreamflowOptions = CommonBucketParams & {
	mode: 'streamflow';
	bucketIndex: number;
	recipient: PublicKey;
	streamflowConfig?: AddStreamflowBucketV2Params['config'];
	timeline: {
		vestingStart: Date;
		vestingEnd: Date;
	};
};

type TreasuryUnlockedOptions = CommonBucketParams & {
	mode: 'unlocked';
	bucketIndex: number;
	recipient: PublicKey;
	unlockedConfig?: Partial<SetOptional<AddUnlockedBucketV2Params, 'bucketIndex' | 'recipient'>>;
	timeline: {
		claimStart: Date;
		claimEnd: Date;
	};
};

type TreasuryOptions = TreasuryStreamflowOptions | TreasuryUnlockedOptions;

const TREASURY_BPS = 2000; // 20% of the total supply

export default function treasury(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: TreasuryOptions,
): BuilderWithDescription {
	if (options.mode === 'unlocked') {
		const {
			bucketIndex,
			recipient,
			unlockedConfig,
			timeline: { claimStart, claimEnd },
			...common
		} = options;

		return {
			description: 'Add treasury unlocked bucket',
			builder: addUnlockedBucketV2(context, {
				...common,
				bucketIndex,
				recipient,
				baseTokenAllocation: supplyShareBps(TREASURY_BPS),
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
