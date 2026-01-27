import { finalizeV2 } from '@metaplex-foundation/genesis';
import type { Context, PublicKey } from '@metaplex-foundation/umi';
import globalLogger from '@/logging/globalLogger';
import type { BuilderWithDescription } from '@/types/BuilderWithDescription';
import getPaddedNum from '@/utils/getPaddedNum';

type FinalizeOptions = {
	genesisAccount: PublicKey;
	baseMint: PublicKey;
	buckets: PublicKey[];
};

export default function finalize(
	context: Pick<Context, 'eddsa' | 'payer' | 'programs' | 'identity'>,
	options: FinalizeOptions,
): BuilderWithDescription {
	const logger = globalLogger.getSubLogger({ name: 'finalize' });
	const { genesisAccount, baseMint, buckets } = options;

	logger.info(`Genesis account: ${genesisAccount}`);
	logger.info(`Base mint: ${baseMint}`);
	logger.info(`Authority: ${context.identity.publicKey}`);
	logger.info(`Buckets (${buckets.length}):`);

	for (const [index, bucket] of buckets.entries()) {
		const num = getPaddedNum(index, buckets.length);
		logger.info(`${num}: ${bucket}`);
	}

	// Build remaining accounts from bucket public keys
	// Buckets need to be writable for the finalize instruction
	const remainingAccounts = buckets.map((pubkey) => ({
		pubkey,
		isSigner: false,
		isWritable: true,
	}));

	const builder = finalizeV2(context, {
		genesisAccount,
		baseMint,
	}).addRemainingAccounts(remainingAccounts);

	// Log the final instruction for debugging
	const items = builder.getInstructions();
	const instruction = items[0];
	if (instruction) {
		logger.info(`Final instruction accounts (${instruction.keys.length}):`);
		for (const [i, key] of instruction.keys.entries()) {
			logger.info(`${i}: ${key.pubkey} (signer: ${key.isSigner}, writable: ${key.isWritable})`);
		}
	}

	return {
		description: 'Finalize Genesis',
		builder,
	};
}
