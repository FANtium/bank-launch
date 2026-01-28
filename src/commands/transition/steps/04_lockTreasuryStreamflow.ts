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

type LockTreasuryStreamflowOptions = CommonBucketParams & {
	cluster: Cluster;
	buckets: { treasuryBucket: PublicKey };
	recipient: PublicKey;
};

export default function lockTreasuryStreamflow(context: Umi, options: LockTreasuryStreamflowOptions): StepResult {
	const {
		baseMint,
		genesisAccount,
		cluster,
		buckets: { treasuryBucket },
		recipient,
	} = options;

	// Generate deterministic metadata signer
	const metadata = createSignerFromSeed(context, `treasury-streamflow-metadata-${baseMint}`);

	// Select timelock program based on cluster
	const timelockProgram = cluster === 'mainnet' ? STREAMFLOW_PROGRAM_ID : DEVNET_STREAMFLOW_PROGRAM_ID;

	// Derive token accounts
	const [genesisBaseTokenAccount] = findAssociatedTokenPda(context, {
		owner: publicKey(genesisAccount),
		mint: baseMint,
	});

	const [bucketQuoteTokenAccount] = findAssociatedTokenPda(context, {
		owner: treasuryBucket,
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
		description: 'Lock treasury bucket via Streamflow',
		builder: lockStreamflowV2(context, {
			genesisAccount,
			bucket: treasuryBucket,
			baseMint,
			genesisBaseTokenAccount,
			bucketQuoteTokenAccount,
			recipient,
			authorityTokenAccount,
			metadata,
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
