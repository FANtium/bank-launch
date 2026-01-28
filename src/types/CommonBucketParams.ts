import type { Pda, PublicKey } from '@metaplex-foundation/umi';

export type CommonBucketParams = {
	genesisAccount: PublicKey | Pda;
	baseMint: PublicKey;
	backendSigner: null;
};
