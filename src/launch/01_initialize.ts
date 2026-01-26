import { initializeV2 } from '@metaplex-foundation/genesis';
import type { Context } from '@metaplex-foundation/umi';
import { BANK_DECIMALS, BANK_TOTAL_SUPPLY, WSOL_MINT } from '@/constants/token';
import type { BuilderWithDescription } from '@/types/BuilderWithDescription';
import type { CommonBucketParams } from '@/types/CommonBucketParams';

type InitializeOptions = CommonBucketParams;

export default function initialize(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs'>,
	options: InitializeOptions,
): BuilderWithDescription[] {
	return [
		{
			description: 'Initialize bank token',
			builder: initializeV2(context, {
				...options,
				quoteMint: WSOL_MINT,
				fundingMode: 0,
				totalSupplyBaseToken: BANK_TOTAL_SUPPLY,

				name: 'Bank Token',
				symbol: 'BANK',
				uri: 'https://fanstrike.fun/bank',
				decimals: BANK_DECIMALS,
			}),
		},
	];
}
