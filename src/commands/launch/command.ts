import { Command, Option } from '@commander-js/extra-typings';
import { findGenesisAccountV2Pda } from '@metaplex-foundation/genesis';
import { createSignerFromKeypair, keypairIdentity } from '@metaplex-foundation/umi';
import initialize from '@/commands/launch/steps/01_initialize';
import privateSale from '@/commands/launch/steps/02_privateSale';
import publicSale from '@/commands/launch/steps/03_publicSale';
import raydiumCpmm from '@/commands/launch/steps/04_raydiumCpmm';
import bankroll from '@/commands/launch/steps/05_bankroll';
import marketing from '@/commands/launch/steps/06_marketing';
import liquidity from '@/commands/launch/steps/07_liquidity';
import treasury from '@/commands/launch/steps/08_treasury';
import finalize from '@/commands/launch/steps/09_finalize';
import fundStreamflowBuckets from '@/commands/launch/steps/10_fundStreamflowBuckets';
import lockMarketingStreamflow from '@/commands/launch/steps/11_lockMarketingStreamflow';
import lockTreasuryStreamflow from '@/commands/launch/steps/12_lockTreasuryStreamflow';
import getBuckets from '@/constants/buckets';
import { walletsMap } from '@/constants/wallets';
import getTimeline from '@/lib/getTimeline';
import globalLogger from '@/lib/logging/globalLogger';
import createUmi from '@/lib/metaplex/createUmi';
import buildPipeline from '@/lib/pipeline/buildPipeline';
import executePipeline from '@/lib/pipeline/executePipeline';
import PipelineError from '@/lib/pipeline/PipelineError';
import printPipeline from '@/lib/pipeline/printPipeline';
import getKeypair from '@/utils/getKeypair';

const launchCommand = new Command('launch')
	.description('Launch BANK token on Solana')
	.addOption(
		new Option('-c, --cluster <cluster>', 'Cluster to connect to')
			.choices(['local', 'devnet', 'mainnet'] as const)
			.default('local' as const),
	)
	.option('-s, --send', 'Send the transactions', false)
	.option('--start-step <number>', 'Step to start from (0-indexed)', '0')
	.action(async (options) => {
		const logger = globalLogger.getSubLogger({ name: 'launch' });
		const { cluster, send, startStep: startStepStr } = options;
		const startStep = Number.parseInt(startStepStr, 10);

		logger.info(`Launching on cluster: ${cluster} (send: ${send})`);

		// Umi setup
		const umi = createUmi(cluster);
		const keypair = await getKeypair('user-deployer');
		umi.use(keypairIdentity(keypair, true));
		logger.info(`Using deployer: ${umi.identity.publicKey}`);

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

		// Buckets
		const bucket = getBuckets(umi, genesisAccount);
		// On local cluster, set publicSaleStart slightly in the past so the lock
		// period has already started when the Streamflow lock steps execute.
		const now = new Date();
		const publicSaleStart = now;
		const timeline = getTimeline(publicSaleStart);
		const wallets = walletsMap[cluster];

		const pipeline = buildPipeline({
			name: 'launch',
			steps: [
				initialize(umi, { ...common, baseMint }),
				privateSale(umi, {
					...common,
					unlockedBucket: {
						bucketIndex: bucket.privateSaleUnlockedBucketIndex,
						recipient: wallets.treasury,
					},
					timeline: {
						claimStart: timeline.claimStart,
						claimEnd: timeline.claimEnd,
					},
				}),
				publicSale(umi, {
					...common,
					unlockedBucket: {
						bucketIndex: bucket.publicSaleUnlockedBucketIndex,
						recipient: wallets.treasury,
					},
					launchpoolBucket: {
						bucketIndex: bucket.publicSaleLaunchPoolBucketIndex,
					},
					timeline: {
						claimStart: timeline.claimStart,
						claimEnd: timeline.claimEnd,
						publicSaleStart: timeline.publicSaleStart,
						publicSaleEnd: timeline.publicSaleEnd,
					},
					buckets: {
						publicSaleUnlockedBucket: bucket.publicSaleUnlockedBucket,
						raydiumCpmmBucket: bucket.raydiumCpmmBucket,
					},
				}),
				raydiumCpmm(umi, {
					...common,
					raydiumCpmm: {
						bucketIndex: bucket.raydiumCpmmBucketIndex,
					},
					timeline: {
						start: timeline.claimStart,
					},
				}),
				bankroll(umi, {
					...common,
					unlockedBucket: {
						bucketIndex: bucket.bankrollUnlockedBucketIndex,
						recipient: wallets.bankroll,
					},
					timeline: {
						claimStart: timeline.claimStart,
						claimEnd: timeline.claimEnd,
					},
				}),
				marketing(umi, {
					...common,
					bucketIndex: bucket.marketingBucketIndex,
					recipient: wallets.marketing,
					timeline: {
						vestingStart: timeline.marketingVestingStart,
						vestingEnd: timeline.marketingVestingEnd,
					},
				}),
				liquidity(umi, {
					...common,
					unlockedBucket: {
						bucketIndex: bucket.liquidityManagementUnlockedBucketIndex,
						recipient: wallets.liquidity,
					},
					timeline: {
						claimStart: timeline.claimStart,
						claimEnd: timeline.claimEnd,
					},
				}),
				treasury(umi, {
					...common,
					bucketIndex: bucket.treasuryBucketIndex,
					recipient: wallets.treasury,
					timeline: {
						vestingStart: timeline.treasuryVestingStart,
						vestingEnd: timeline.treasuryVestingEnd,
					},
				}),
				finalize(umi, {
					...common,
					buckets: [
						bucket.privateSaleUnlockedBucket,
						bucket.publicSaleUnlockedBucket,
						bucket.publicSaleLaunchPoolBucket,
						bucket.raydiumCpmmBucket,
						bucket.bankrollUnlockedBucket,
						bucket.marketingBucket,
						bucket.liquidityManagementUnlockedBucket,
						bucket.treasuryBucket,
					],
				}),
				fundStreamflowBuckets(umi, { baseMint: baseMint.publicKey }),
				lockMarketingStreamflow(umi, {
					...common,
					cluster,
					buckets: { marketingBucket: bucket.marketingBucket },
					recipient: wallets.marketing,
				}),
				lockTreasuryStreamflow(umi, {
					...common,
					cluster,
					buckets: { treasuryBucket: bucket.treasuryBucket },
					recipient: wallets.treasury,
				}),
			],
		});
		pipeline.startStep = startStep;
		printPipeline(pipeline);

		if (send) {
			try {
				await executePipeline(umi, pipeline);
				logger.info('Launch completed successfully.');
			} catch (error) {
				if (error instanceof PipelineError) {
					logger.error(`Pipeline failed at step ${error.stepIndex}: ${error.message}`);

					if (error.cause) {
						logger.error(error.cause);
					}

					logger.info(`To resume from the failed step, run:`);
					logger.info(`  bun run bank launch --cluster ${cluster} --start-step ${error.stepIndex} --send`);
				}
				process.exit(1);
			}
		}
	});

export default launchCommand;
