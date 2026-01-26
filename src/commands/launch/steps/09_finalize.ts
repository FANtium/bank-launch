import { finalizeV2 } from '@metaplex-foundation/genesis';
import type { Context, PublicKey } from '@metaplex-foundation/umi';
import type { BuilderWithDescription } from '@/types/BuilderWithDescription';

type FinalizeOptions = {
	genesisAccount: PublicKey;
	baseMint: PublicKey;
};

export default function finalize(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs' | 'identity'>,
	options: FinalizeOptions,
): BuilderWithDescription[] {
	const { genesisAccount, baseMint } = options;

	return [
		{
			description: 'Finalize Genesis',
			builder: finalizeV2(context, {
				genesisAccount,
				baseMint,
			}),
		},
	];
}
