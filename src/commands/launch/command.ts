import { type Command, Option } from '@commander-js/extra-typings';
import { keypairIdentity } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import getLaunchSteps from '@/commands/launch/getLaunchSteps';
import createUmi from '@/lib/createUmi';
import globalLogger from '@/logging/globalLogger';
import getKeypair from '@/utils/getKeypair';

const logger = globalLogger.getSubLogger({ name: 'launch' });

interface LaunchOptions {
	cluster: 'local' | 'devnet' | 'mainnet';
	send: boolean;
	seed: string;
}

async function launchAction(options: LaunchOptions) {
	const { cluster, send, seed } = options;

	logger.info(`Launching on cluster: ${cluster} (send: ${send})`);

	// Umi setup
	const umi = createUmi(cluster);
	const keypair = await getKeypair('deployer');
	umi.use(keypairIdentity(keypair, true));
	logger.info(`Using deployer: ${umi.identity.publicKey}`);

	const steps = getLaunchSteps(umi, { cluster, seed });
	logger.info(`Total steps to execute: ${steps.length}`);

	for (const [index, step] of steps.entries()) {
		const numWithSpacePadding = `${index + 1}`.padStart(`${steps.length}`.length, ' ');
		logger.info(`[${numWithSpacePadding}/${steps.length}] ${step.description}`);
	}

	if (send) {
		for (const [index, step] of steps.entries()) {
			const numWithSpacePadding = `${index + 1}`.padStart(`${steps.length}`.length, ' ');
			logger.info(`⏳ [${numWithSpacePadding}/${steps.length}] ${step.description}...`);
			const result = await step.builder.sendAndConfirm(umi);
			const signature58 = base58.deserialize(result.signature);
			logger.info(`✅ [${numWithSpacePadding}/${steps.length}] ${step.description} sent: ${signature58}`);
		}
		logger.info('Launch completed successfully.');
	}
}

export function registerLaunchCommand(program: Command) {
	program
		.command('launch')
		.description('Launch BANK token on Solana')
		.addOption(
			new Option('-c, --cluster <cluster>', 'Cluster to connect to')
				.choices(['local', 'devnet', 'mainnet'] as const)
				.default('devnet' as const),
		)
		.option('-s, --send', 'Send the transactions', false)
		.option('--seed <seed>', 'Seed for mint derivation', 'bank-launch')
		.action(launchAction);
}
