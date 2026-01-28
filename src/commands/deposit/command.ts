import { Command, Option } from '@commander-js/extra-typings';
import {
	depositLaunchPoolV2,
	findGenesisAccountV2Pda,
	findLaunchPoolDepositV2Pda,
	safeFetchLaunchPoolDepositV2,
} from '@metaplex-foundation/genesis';
import {
	createTokenIfMissing,
	findAssociatedTokenPda,
	syncNative,
	transferSol,
} from '@metaplex-foundation/mpl-toolbox';
import { createSignerFromKeypair, keypairIdentity, sol } from '@metaplex-foundation/umi';
import getBuckets from '@/constants/buckets';
import { WSOL_MINT } from '@/constants/token';
import globalLogger from '@/lib/logging/globalLogger';
import createUmi from '@/lib/metaplex/createUmi';
import getKeypair from '@/utils/getKeypair';
import padding from '@/utils/padding';

const depositCommand = new Command('deposit')
	.description('Deposit SOL into the Metaplex Genesis public sale launch pool')
	.argument('<keypair>', 'Name of the keypair file in secrets/ (without .json extension)')
	.argument('<amountSOL>', 'Amount of SOL to deposit (decimal number)')
	.addOption(
		new Option('-c, --cluster <cluster>', 'Cluster to connect to')
			.choices(['local', 'devnet', 'mainnet'] as const)
			.default('local' as const),
	)
	.action(async (keypairName, amountSOLStr, options) => {
		const logger = globalLogger.getSubLogger({ name: 'deposit' });
		const { cluster } = options;
		const amountSOL = Number.parseFloat(amountSOLStr);

		if (Number.isNaN(amountSOL) || amountSOL <= 0) {
			logger.error('Invalid amount. Please provide a positive decimal number.');
			process.exit(1);
		}

		logger.info(`Depositing ${amountSOL} SOL on cluster: ${cluster}`);

		// Umi setup
		const umi = createUmi(cluster);

		// Load depositor keypair and set as identity
		const depositorKeypair = await getKeypair(keypairName);
		umi.use(keypairIdentity(depositorKeypair, true));
		const depositor = createSignerFromKeypair(umi, depositorKeypair);
		logger.info(`Depositor: ${depositor.publicKey}`);

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
		logger.info(`Deposit amount: ${amountLamports} lamports`);

		// Find the depositor's WSOL ATA
		const [depositorWsolAta] = findAssociatedTokenPda(umi, {
			mint: WSOL_MINT,
			owner: depositor.publicKey,
		});
		logger.info(`Depositor WSOL ATA: ${depositorWsolAta}`);

		// Build transaction: create WSOL ATA if missing, transfer SOL, sync native, then deposit
		const tx = createTokenIfMissing(umi, {
			mint: WSOL_MINT,
			owner: depositor.publicKey,
			token: depositorWsolAta,
		})
			.add(
				transferSol(umi, {
					source: depositor,
					destination: depositorWsolAta,
					amount: sol(amountSOL),
				}),
			)
			.add(syncNative(umi, { account: depositorWsolAta }))
			.add(
				depositLaunchPoolV2(umi, {
					genesisAccount,
					bucket: bucket.publicSaleLaunchPoolBucket,
					baseMint: baseMint.publicKey,
					depositor,
					recipient: depositor,
					padding: padding(7),
					amountQuoteToken: amountLamports,
				}),
			);

		const result = await tx.sendAndConfirm(umi);
		const signature = Buffer.from(result.signature).toString('base64');
		logger.info(`Transaction signature: ${signature}`);

		// Fetch and display the deposit account
		const [depositPda] = findLaunchPoolDepositV2Pda(umi, {
			bucket: bucket.publicSaleLaunchPoolBucket,
			recipient: depositor.publicKey,
		});

		const depositAccount = await safeFetchLaunchPoolDepositV2(umi, depositPda);
		if (depositAccount) {
			const totalDepositedSOL = Number(depositAccount.amountQuoteToken) / 1_000_000_000;
			logger.info(`Current deposited amount: ${totalDepositedSOL} SOL`);
		} else {
			logger.warn('Could not fetch deposit account');
		}
	});

export default depositCommand;
