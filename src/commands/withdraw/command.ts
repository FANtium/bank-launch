import { Command, Option } from '@commander-js/extra-typings';
import {
	findGenesisAccountV2Pda,
	findLaunchPoolDepositV2Pda,
	safeFetchLaunchPoolDepositV2,
	withdrawLaunchPoolV2,
} from '@metaplex-foundation/genesis';
import { closeToken, createTokenIfMissing, findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox';
import { createSignerFromKeypair, keypairIdentity, sol } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import getBuckets from '@/constants/buckets';
import { WSOL_MINT } from '@/constants/token';
import globalLogger from '@/lib/logging/globalLogger';
import createUmi from '@/lib/metaplex/createUmi';
import getKeypair from '@/utils/getKeypair';
import padding from '@/utils/padding';

const withdrawCommand = new Command('withdraw')
	.description('Withdraw SOL from the Metaplex Genesis public sale launch pool')
	.argument('<keypair>', 'Name of the keypair file in secrets/ (without .json extension)')
	.argument('<amountSOL>', 'Amount of SOL to withdraw (decimal number)')
	.addOption(
		new Option('-c, --cluster <cluster>', 'Cluster to connect to')
			.choices(['local', 'devnet', 'mainnet'] as const)
			.default('local' as const),
	)
	.action(async (keypairName, amountSOLStr, options) => {
		const logger = globalLogger.getSubLogger({ name: 'withdraw' });
		const { cluster } = options;
		const amountSOL = Number.parseFloat(amountSOLStr);

		if (Number.isNaN(amountSOL) || amountSOL <= 0) {
			logger.error('Invalid amount. Please provide a positive decimal number.');
			process.exit(1);
		}

		logger.info(`Withdrawing ${amountSOL} SOL on cluster: ${cluster}`);

		// Umi setup
		const umi = createUmi(cluster);

		// Load withdrawer keypair and set as identity
		const withdrawerKeypair = await getKeypair(keypairName);
		umi.use(keypairIdentity(withdrawerKeypair, true));
		const withdrawer = createSignerFromKeypair(umi, withdrawerKeypair);
		logger.info(`Withdrawer: ${withdrawer.publicKey}`);

		// Load bank keypair to derive genesis account
		const baseMint = createSignerFromKeypair(umi, await getKeypair('bank'));

		// Genesis account PDA
		const [genesisAccount] = findGenesisAccountV2Pda(umi, {
			baseMint: baseMint.publicKey,
			genesisIndex: 0,
		});
		logger.info(`Genesis Account: ${genesisAccount}`);

		// Get buckets
		const bucket = getBuckets(umi, genesisAccount);
		logger.info(`Launch Pool Bucket: ${bucket.publicSaleLaunchPoolBucket}`);

		// Convert SOL to lamports
		const amountLamports = sol(amountSOL).basisPoints;
		logger.info(`Withdraw amount: ${amountLamports} lamports`);

		// Find the withdrawer's WSOL ATA
		const [withdrawerWsolAta] = findAssociatedTokenPda(umi, {
			mint: WSOL_MINT,
			owner: withdrawer.publicKey,
		});
		logger.info(`Withdrawer WSOL ATA: ${withdrawerWsolAta}`);

		// Build transaction: create WSOL ATA if missing, withdraw, close ATA to unwrap
		// Note: This follows the Meteora pattern - any existing WSOL in the ATA will also be unwrapped
		const tx = createTokenIfMissing(umi, {
			mint: WSOL_MINT,
			owner: withdrawer.publicKey,
			token: withdrawerWsolAta,
		})
			.add(
				withdrawLaunchPoolV2(umi, {
					genesisAccount,
					bucket: bucket.publicSaleLaunchPoolBucket,
					baseMint: baseMint.publicKey,
					withdrawer,
					padding: padding(7),
					amountQuoteToken: amountLamports,
				}),
			)
			.add(
				closeToken(umi, {
					account: withdrawerWsolAta,
					destination: withdrawer.publicKey,
					owner: withdrawer,
				}),
			);

		const result = await tx.sendAndConfirm(umi);
		const [signature] = base58.deserialize(result.signature);
		logger.info(`Transaction signature: ${signature}`);

		// Fetch and display the deposit account
		const [depositPda] = findLaunchPoolDepositV2Pda(umi, {
			bucket: bucket.publicSaleLaunchPoolBucket,
			recipient: withdrawer.publicKey,
		});

		const depositAccount = await safeFetchLaunchPoolDepositV2(umi, depositPda);
		if (depositAccount) {
			const remainingDepositSOL = Number(depositAccount.amountQuoteToken) / 1_000_000_000;
			logger.info(`Remaining deposited amount: ${remainingDepositSOL} SOL`);
		} else {
			logger.info('Deposit account closed (fully withdrawn)');
		}
	});

export default withdrawCommand;
