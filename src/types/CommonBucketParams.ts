import type { BackendSignerArgs } from '@metaplex-foundation/genesis';
import type { OptionOrNullable, Pda, PublicKey } from '@metaplex-foundation/umi';

export type CommonBucketParams = {
	genesisAccount: PublicKey | Pda;
	baseMint: PublicKey;
	backendSigner: OptionOrNullable<BackendSignerArgs>;
};
