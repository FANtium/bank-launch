import { findGenesisAccountV2Pda } from '@metaplex-foundation/genesis';
import {
	createTokenIfMissing,
	findAssociatedTokenPda,
	syncNative,
	transferSol,
	transferTokens,
} from '@metaplex-foundation/mpl-toolbox';
import { type PublicKey, sol, type Umi } from '@metaplex-foundation/umi';
import getBuckets from '@/constants/buckets';
import { WSOL_MINT } from '@/constants/token';
import type { StepResult } from '@/lib/pipeline/types';

/**
 * Amount of SOL to fund each Streamflow bucket's WSOL ATA.
 * Streamflow charges 0.117 SOL service fee per lock, plus ~0.015 SOL in network fees.
 * @see https://docs.streamflow.finance/en/articles/9675153-costs-of-using-streamflow
 */
const STREAMFLOW_BUCKET_WSOL_AMOUNT = 0.15; // SOL

type FundStreamflowBucketsOptions = {
	baseMint: PublicKey;
};

/**
 * Prepare the environment for Streamflow lock steps.
 *
 * This funds the WSOL ATAs for marketing/treasury buckets (covers Streamflow SOL service fee).
 * The Streamflow treasury BANK ATA is created automatically by the lock instruction.
 *
 * Returns multiple steps:
 * 1. Wrap SOL to deployer's WSOL ATA (creates ATA if needed)
 * 2. Fund marketing bucket WSOL ATA
 * 3. Fund treasury bucket WSOL ATA
 */
export default function fundStreamflowBuckets(umi: Umi, options: FundStreamflowBucketsOptions): StepResult {
	const { baseMint } = options;

	const [genesisAccount] = findGenesisAccountV2Pda(umi, { baseMint, genesisIndex: 0 });
	const bucket = getBuckets(umi, genesisAccount);

	// Deployer's WSOL ATA
	const [deployerWsolAta] = findAssociatedTokenPda(umi, {
		owner: umi.identity.publicKey,
		mint: WSOL_MINT,
	});

	const buckets = [
		{ label: 'marketing', bucketPda: bucket.marketingBucket },
		{ label: 'treasury', bucketPda: bucket.treasuryBucket },
	];

	const totalWsolAmount = STREAMFLOW_BUCKET_WSOL_AMOUNT * buckets.length;

	// Step 1: Create deployer's WSOL ATA (if needed) and wrap SOL
	const wrapSolBuilder = createTokenIfMissing(umi, {
		mint: WSOL_MINT,
		owner: umi.identity.publicKey,
		token: deployerWsolAta,
	})
		.add(
			transferSol(umi, {
				destination: deployerWsolAta,
				amount: sol(totalWsolAmount),
			}),
		)
		.add(syncNative(umi, { account: deployerWsolAta }));

	// Steps 3 & 4: Create and fund each bucket's WSOL ATA
	const bucketSteps = buckets.map(({ label, bucketPda }) => {
		const [bucketWsolAta] = findAssociatedTokenPda(umi, {
			owner: bucketPda,
			mint: WSOL_MINT,
		});

		const builder = createTokenIfMissing(umi, {
			mint: WSOL_MINT,
			owner: bucketPda,
			token: bucketWsolAta,
		}).add(
			transferTokens(umi, {
				source: deployerWsolAta,
				destination: bucketWsolAta,
				amount: sol(STREAMFLOW_BUCKET_WSOL_AMOUNT).basisPoints,
			}),
		);

		return {
			description: `Fund ${label} bucket WSOL ATA`,
			builder,
		};
	});

	return [{ description: `Wrap ${totalWsolAmount} SOL to deployer WSOL ATA`, builder: wrapSolBuilder }, ...bucketSteps];
}
