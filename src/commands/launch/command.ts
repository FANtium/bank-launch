import { Command, Option } from '@commander-js/extra-typings';
import { keypairIdentity } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import getLaunchSteps from '@/commands/launch/getLaunchSteps';
import createUmi from '@/lib/createUmi';
import globalLogger from '@/logging/globalLogger';
import getKeypair from '@/utils/getKeypair';

const launchCommand = new Command('launch')
	.description('Launch BANK token on Solana')
	.addOption(
		new Option('-c, --cluster <cluster>', 'Cluster to connect to')
			.choices(['local', 'devnet', 'mainnet'] as const)
			.default('devnet' as const),
	)
	.option('-s, --send', 'Send the transactions', false)
	.option('--seed <seed>', 'Seed for mint derivation', 'bank-launch')
	.option('--no-streamflow', 'Use unlocked buckets instead of streamflow')
	.option('--start-step <number>', 'Step to start from (0-indexed)', '0')
	.action(async (options) => {
		const logger = globalLogger.getSubLogger({ name: 'launch' });
		const { cluster, send, seed, streamflow, startStep: startStepStr } = options;
		const noStreamflow = !streamflow;
		const startStep = Number.parseInt(startStepStr, 10);

		logger.info(`Launching on cluster: ${cluster} (send: ${send})`);

		// Umi setup
		const umi = createUmi(cluster);
		const keypair = await getKeypair('deployer');
		umi.use(keypairIdentity(keypair, true));
		logger.info(`Using deployer: ${umi.identity.publicKey}`);

		const allSteps = getLaunchSteps(umi, { cluster, seed, noStreamflow });

		// Validate start step
		if (startStep < 0 || startStep >= allSteps.length) {
			logger.error(`Invalid start step: ${startStep}. Must be between 0 and ${allSteps.length - 1}`);
			process.exit(1);
		}

		const steps = allSteps.slice(startStep);
		const totalSteps = allSteps.length;

		if (startStep > 0) {
			logger.info(`Skipping steps 0-${startStep - 1}, starting from step ${startStep}`);
		}
		logger.info(`Steps to execute: ${steps.length} (of ${totalSteps} total)`);

		// List all steps with their actual step numbers
		for (const [index, step] of steps.entries()) {
			const actualStepNum = startStep + index;
			const numWithSpacePadding = `${actualStepNum}`.padStart(`${totalSteps - 1}`.length, ' ');
			logger.info(`[${numWithSpacePadding}] ${step.description}`);
		}

		if (send) {
			const completedSteps: number[] = [];

			for (const [index, step] of steps.entries()) {
				const actualStepNum = startStep + index;
				const numWithSpacePadding = `${actualStepNum}`.padStart(`${totalSteps - 1}`.length, ' ');

				try {
					logger.info(`⏳ [${numWithSpacePadding}] ${step.description}...`);
					const result = await step.builder.sendAndConfirm(umi);
					const [signature58] = base58.deserialize(result.signature);
					logger.info(`✅ [${numWithSpacePadding}] ${step.description} sent: ${signature58}`);
					completedSteps.push(actualStepNum);
				} catch (error) {
					logger.error(`❌ [${numWithSpacePadding}] ${step.description} failed`);
					logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);

					if (completedSteps.length > 0) {
						logger.info(`Completed steps before failure: ${completedSteps.join(', ')}`);
					}

					logger.info(`To resume from the failed step, run:`);
					logger.info(`  bun run bank launch --start-step ${actualStepNum} -s`);

					process.exit(1);
				}
			}
			logger.info('Launch completed successfully.');
		}
	});

export default launchCommand;
