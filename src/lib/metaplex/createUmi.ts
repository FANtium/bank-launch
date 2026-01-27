import { genesis } from '@metaplex-foundation/genesis';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { createUmi as defaultCreateUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { defaultRpcURLs } from '@/constants/rpc';
import type Cluster from '@/types/Cluster';

export default function createUmi(cluster: Cluster) {
	const rpcURL = defaultRpcURLs[cluster];
	return defaultCreateUmi(rpcURL, { commitment: 'confirmed' }).use(genesis()).use(mplTokenMetadata());
}
