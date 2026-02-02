import { Command, Option } from '@commander-js/extra-typings';
import { findGenesisAccountV2Pda } from '@metaplex-foundation/genesis';
import { createSignerFromKeypair, keypairIdentity } from '@metaplex-foundation/umi';
import transitionPublicSale from '@/commands/transition/steps/01_transitionPublicSale';
import graduateRaydiumCpmm from '@/commands/transition/steps/02_graduateRaydiumCpmm';
import lockMarketingStreamflow from '@/commands/transition/steps/03_lockMarketingStreamflow';
import lockTreasuryStreamflow from '@/commands/transition/steps/04_lockTreasuryStreamflow';
import getBuckets from '@/constants/buckets';
import { walletsMap } from '@/constants/wallets';
import globalLogger from '@/lib/logging/globalLogger';
import createUmi from '@/lib/metaplex/createUmi';
import buildPipeline from '@/lib/pipeline/buildPipeline';
import executePipeline from '@/lib/pipeline/executePipeline';
import PipelineError from '@/lib/pipeline/PipelineError';
import printPipeline from '@/lib/pipeline/printPipeline';
import getKeypair from '@/utils/getKeypair';

const transitionCommand = new Command('transition')
	.description('Transition buckets after public sale')
	.addOption(
		new Option('-c, --cluster <cluster>', 'Cluster to connect to')
			.choices(['local', 'devnet', 'mainnet'] as const)
			.default('local' as const),
	)
	.option('-s, --send', 'Send the transactions', false)
	.option('--start-step <number>', 'Step to start from (0-indexed)', '0')
	.action(async (options) => {
		const logger = globalLogger.getSubLogger({ name: 'transition' });
		const { cluster, send, startStep: startStepStr } = options;
		const startStep = Number.parseInt(startStepStr, 10);

		logger.info(`Transitioning buckets on cluster: ${cluster}`);

		// Umi setup
		const umi = createUmi(cluster);
		const keypair = await getKeypair('user-deployer');
		umi.use(keypairIdentity(keypair, true));
		logger.info(`Using deployer: ${umi.identity.publicKey}`);

		// Hash the seed string to get exactly 32 bytes (SHA-256 output)
		const baseMint = createSignerFromKeypair(umi, await getKeypair('bank'));

		// Genesis account
		const [genesisAccount] = findGenesisAccountV2Pda(umi, {
			baseMint: baseMint.publicKey,
			genesisIndex: 0,
		});

		const common = {
			baseMint: baseMint.publicKey,
			genesisAccount,
			backendSigner: null,
		};

		const buckets = getBuckets(umi, genesisAccount);
		const wallets = walletsMap[cluster];

		const pipeline = buildPipeline({
			name: 'transition',
			steps: [
				transitionPublicSale(umi, {
					...common,
					buckets,
				}),
				graduateRaydiumCpmm(umi, {
					...common,
					cluster,
					buckets,
				}),
				lockMarketingStreamflow(umi, {
					...common,
					cluster,
					buckets: { marketingBucket: buckets.marketingBucket },
					recipient: wallets.marketing,
				}),
				lockTreasuryStreamflow(umi, {
					...common,
					cluster,
					buckets: { treasuryBucket: buckets.treasuryBucket },
					recipient: wallets.treasury,
				}),
			],
		});
		pipeline.startStep = startStep;
		printPipeline(pipeline);

		if (send) {
			try {
				await executePipeline(umi, pipeline);
				logger.info('Transition completed successfully.');
			} catch (error) {
				if (error instanceof PipelineError) {
					logger.info(`To resume from the failed step, run:`);
					logger.info(`  bun run bank transition --start-step ${error.stepIndex} -s`);
				}
				process.exit(1);
			}
		}
	});

export default transitionCommand;
