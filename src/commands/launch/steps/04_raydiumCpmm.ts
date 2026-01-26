import { addRaydiumCpmmBucketV2 } from '@metaplex-foundation/genesis';
import type { Context } from '@metaplex-foundation/umi';
import type { AddRaydiumCpmmBucketV2Params } from '@/types/AddRaydiumCpmmBucketV2Params';
import type { BuilderWithDescription } from '@/types/BuilderWithDescription';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import type { SetOptional } from '@/types/SetOptional';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type RaydiumCpmmOptions = CommonBucketParams & {
	raydiumCpmm: SetOptional<AddRaydiumCpmmBucketV2Params, 'bucketIndex'>;
	timeline: {
		start: Date;
	};
};

export default function raydiumCpmm(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: RaydiumCpmmOptions,
): BuilderWithDescription[] {
	const { raydiumCpmm, timeline, ...common } = options;

	return [
		{
			description: 'Add Raydium CPMM bucket',
			builder: addRaydiumCpmmBucketV2(context, {
				...common,
				baseTokenAllocation: supplyShareBps(200), // 2% of the total supply
				startCondition: timeAbsolute(timeline.start),
				...raydiumCpmm,
			}),
		},
	];
}
