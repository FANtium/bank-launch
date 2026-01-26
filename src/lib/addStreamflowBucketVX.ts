import { addStreamflowBucketV2 } from '@metaplex-foundation/genesis';
import type { Context } from '@metaplex-foundation/umi';

type AddStreamflowBucketV2Params = Parameters<typeof addStreamflowBucketV2>[1];
type StreamflowConfigArgs = AddStreamflowBucketV2Params['config'];

const day = 60 * 60 * 24; // 1 day in seconds
const period = day; // 1 day

// Default config for Streamflow buckets
// See https://github.com/streamflow-finance/js-sdk/blob/master/packages/stream/README.md for details
const defaultConfig = {
	cliffAmount: 0, // no cliff, vesting starts immediately
	period,
	cancelableByRecipient: false,
	cancelableBySender: false,
	canTopup: false,
	canUpdateRate: false,
	transferableBySender: false,
	automaticWithdrawal: true,
	withdrawFrequency: 60 * 60 * 24, // 1 day
	transferableByRecipient: true,
	pausable: false,
} satisfies Partial<StreamflowConfigArgs>;
type StreamflowConfigDefaultKeys = keyof typeof defaultConfig;

type AddStreamflowBucketVXParams = Omit<AddStreamflowBucketV2Params, 'config'> & {
	config: Omit<StreamflowConfigArgs, StreamflowConfigDefaultKeys | 'cliff' | 'amountPerPeriod'> &
		Partial<Pick<StreamflowConfigArgs, StreamflowConfigDefaultKeys>> & {
			cliff?: number | bigint;
			endTime: number | bigint;
		};
};

export default function addStreamflowBucketVX(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	{ config, ...params }: AddStreamflowBucketVXParams,
) {
	if (typeof params.baseTokenAllocation === 'undefined') {
		throw new Error('baseTokenAllocation cannot be undefined');
	}

	const totalVestingTime = BigInt(config.endTime) - BigInt(config.startTime);
	const periods = totalVestingTime / BigInt(period);
	const amountPerPeriod = BigInt(params.baseTokenAllocation) / periods;

	// TODO: use the Streamflow bucket creation when available
	// return addStreamflowBucketV1(context, finalParams);
	return addStreamflowBucketV2(context, {
		...params,
		config: {
			...defaultConfig,
			cliff: config.cliff ?? config.startTime,
			amountPerPeriod,
			...config,
		},
	});
}
