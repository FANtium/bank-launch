import {
	DEVNET_STREAMFLOW_PROGRAM_ID,
	FEE_ORACLE_ADDRESS,
	findStreamflowMetadataPda,
	lockStreamflowV2,
	STREAMFLOW_PROGRAM_ID,
	STREAMFLOW_TREASURY,
	WITHDRAWOR_ADDRESS,
} from '@metaplex-foundation/genesis';
import { findAssociatedTokenPda, setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import { type PublicKey, publicKey, type Umi } from '@metaplex-foundation/umi';
import { publicKey as publicKeySerializer, string } from '@metaplex-foundation/umi/serializers';
import { DEVNET_FEE_ORACLE_ADDRESS } from '@/constants/streamflow';
import { WSOL_MINT } from '@/constants/token';
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

	// Derive metadata PDA from the bucket
	const [metadata] = findStreamflowMetadataPda(context, { bucket: treasuryBucket });

	// Select timelock program and fee oracle based on cluster.
	// On local (forking devnet), use the devnet Streamflow program and fee oracle.
	const timelockProgram = cluster === 'mainnet' ? STREAMFLOW_PROGRAM_ID : DEVNET_STREAMFLOW_PROGRAM_ID;
	const feeOracle = cluster === 'mainnet' ? FEE_ORACLE_ADDRESS : DEVNET_FEE_ORACLE_ADDRESS;

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

	// Derive escrow PDA using the cluster-specific Streamflow program ID.
	// findEscrowTokenPda from the SDK hardcodes the mainnet program ID, which
	// produces the wrong PDA on devnet/local where the program ID differs.
	const escrowTokens = context.eddsa.findPda(timelockProgram, [
		string({ size: 'variable' }).serialize('strm'),
		publicKeySerializer().serialize(metadata),
	]);

	return {
		description: 'Lock treasury bucket via Streamflow',
		builder: setComputeUnitLimit(context, { units: 400_000 }).add(
			lockStreamflowV2(context, {
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
				feeOracle,
				timelockProgram,
				padding: padding(7),
			}),
		),
	};
}
