import {
	DEVNET_STREAMFLOW_PROGRAM_ID,
	FEE_ORACLE_ADDRESS,
	findEscrowTokenPda,
	lockStreamflowV2,
	STREAMFLOW_PROGRAM_ID,
	STREAMFLOW_TREASURY,
	WITHDRAWOR_ADDRESS,
} from '@metaplex-foundation/genesis';
import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox';
import { type PublicKey, publicKey, type Umi } from '@metaplex-foundation/umi';
import { WSOL_MINT } from '@/constants/token';
import createSignerFromSeed from '@/lib/metaplex/createSignerFromSeed';
import type { StepResult } from '@/lib/pipeline/types';
import type Cluster from '@/types/Cluster';
import type { CommonBucketParams } from '@/types/CommonBucketParams';
import padding from '@/utils/padding';

type LockMarketingStreamflowOptions = CommonBucketParams & {
	cluster: Cluster;
	buckets: { marketingBucket: PublicKey };
	recipient: PublicKey;
};

export default function lockMarketingStreamflow(context: Umi, options: LockMarketingStreamflowOptions): StepResult {
	const {
		baseMint,
		genesisAccount,
		cluster,
		buckets: { marketingBucket },
		recipient,
	} = options;

	// Generate deterministic metadata signer
	const metadata = createSignerFromSeed(context, `marketing-streamflow-metadata-${baseMint}`);

	// Select timelock program based on cluster
	const timelockProgram = cluster === 'mainnet' ? STREAMFLOW_PROGRAM_ID : DEVNET_STREAMFLOW_PROGRAM_ID;

	// Derive token accounts
	const [genesisBaseTokenAccount] = findAssociatedTokenPda(context, {
		owner: publicKey(genesisAccount),
		mint: baseMint,
	});

	const [bucketQuoteTokenAccount] = findAssociatedTokenPda(context, {
		owner: marketingBucket,
		mint: WSOL_MINT,
	});

	const [authorityTokenAccount] = findAssociatedTokenPda(context, {
		owner: context.identity.publicKey,
		mint: baseMint,
	});

	const [recipientTokens] = findAssociatedTokenPda(context, {
		owner: recipient,
		mint: baseMint,
	});

	const [streamflowTreasuryTokens] = findAssociatedTokenPda(context, {
		owner: STREAMFLOW_TREASURY,
		mint: baseMint,
	});

	const [escrowTokens] = findEscrowTokenPda(context, metadata.publicKey);

	return {
		description: 'Lock marketing bucket via Streamflow',
		builder: lockStreamflowV2(context, {
			genesisAccount,
			bucket: marketingBucket,
			baseMint,
			genesisBaseTokenAccount,
			bucketQuoteTokenAccount,
			recipient,
			authorityTokenAccount,
			metadata: metadata.publicKey,
			escrowTokens,
			recipientTokens,
			streamflowTreasury: STREAMFLOW_TREASURY,
			streamflowTreasuryTokens,
			withdrawor: WITHDRAWOR_ADDRESS,
			partner: STREAMFLOW_TREASURY,
			partnerTokens: streamflowTreasuryTokens,
			feeOracle: FEE_ORACLE_ADDRESS,
			timelockProgram,
			padding: padding(7),
		}),
	};
}
