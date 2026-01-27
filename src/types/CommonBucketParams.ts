import type { BackendSignerArgs } from '@metaplex-foundation/genesis';
import type { Pda, PublicKey } from '@metaplex-foundation/umi';

export type CommonBucketParams = {
	genesisAccount: PublicKey | Pda;
	baseMint: PublicKey;
	backendSigner: BackendSignerArgs;
};
