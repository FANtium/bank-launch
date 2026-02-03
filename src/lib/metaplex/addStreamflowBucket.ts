import { addStreamflowBucketV2 } from '@metaplex-foundation/genesis';
import type { Context } from '@metaplex-foundation/umi';

type AddStreamflowBucketV2Params = Parameters<typeof addStreamflowBucketV2>[1];
type StreamflowConfigArgs = AddStreamflowBucketV2Params['config'];

const hour = 60 * 60; // 1 hour in seconds
const periodInSeconds = hour; // 1 hour

// Default config for Streamflow buckets
// See https://github.com/streamflow-finance/js-sdk/blob/master/packages/stream/README.md for details
const defaultConfig = {
	period: periodInSeconds,
	cancelableByRecipient: false,
	cancelableBySender: false,
	canTopup: false,
	canUpdateRate: false,
	transferableBySender: false,
	automaticWithdrawal: true,
	withdrawFrequency: hour, // 1 hour
	transferableByRecipient: true,
	pausable: false,
} satisfies Partial<StreamflowConfigArgs>;
type StreamflowConfigDefaultKeys = keyof typeof defaultConfig;

type AddStreamflowBucketParams = Omit<AddStreamflowBucketV2Params, 'config'> & {
	config: Omit<StreamflowConfigArgs, StreamflowConfigDefaultKeys | 'cliff' | 'amountPerPeriod' | 'startTime'> &
		Partial<Pick<StreamflowConfigArgs, StreamflowConfigDefaultKeys>> & {
			cliff?: number | bigint;
			startDate: number | bigint;
			endDate: number | bigint;
		};
};

/**
 * Creates a Streamflow vesting bucket with automatic period/amount calculations.
 *
 * The function calculates:
 * - Number of vesting periods based on the duration and period length (1 hour)
 * - Amount to distribute per period (locked tokens / number of periods)
 * - Any remainder from rounding is added to the cliff (initial unlock)
 *
 * @param context - Umi context with eddsa, payer, and programs
 * @param params - Bucket parameters including config with startDate/endDate
 */
export default function addStreamflowBucket(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	{ config, ...params }: AddStreamflowBucketParams,
) {
	if (typeof params.baseTokenAllocation === 'undefined') {
		throw new Error('baseTokenAllocation cannot be undefined');
	}

	// cliff = amount unlocked immediately at startDate
	const cliffAmount = BigInt(config.cliffAmount ?? 0);

	// lockedAmount = tokens that will vest over time (total - cliff)
	const lockedAmount = BigInt(params.baseTokenAllocation) - cliffAmount;

	// Calculate vesting duration and number of periods
	// Each period is 1 hour (3600 seconds)
	const vestingDurationInSeconds = BigInt(config.endDate) - BigInt(config.startDate);
	const numberOfPeriods = vestingDurationInSeconds / BigInt(periodInSeconds);

	// BigInt division truncates, so we need to handle the remainder
	// to ensure all tokens are distributed
	const amountPerPeriod = lockedAmount / numberOfPeriods;
	const distributedViaVesting = amountPerPeriod * numberOfPeriods;
	const roundingRemainder = lockedAmount - distributedViaVesting;

	// Add rounding remainder to cliff so no tokens are left undistributed
	const adjustedCliff = cliffAmount + roundingRemainder;

	// startTime = seconds until vesting begins (0 if startDate is in the past)
	const nowInSeconds = Math.floor(Date.now() / 1000);
	const startTime = Math.max(Number(config.startDate) - nowInSeconds, 0);

	return addStreamflowBucketV2(context, {
		...params,
		config: {
			...defaultConfig,
			...config,
			cliff: startTime,
			cliffAmount: adjustedCliff,
			amountPerPeriod,
			startTime,
		},
	});
}
