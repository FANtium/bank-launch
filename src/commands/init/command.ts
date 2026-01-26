import { resolve } from 'node:path';
import type { Command } from '@commander-js/extra-typings';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { defaultRpcURLs } from '@/constants/rpc';
import globalLogger from '@/logging/globalLogger';

interface InitOptions {
	force: boolean;
	outputDir: string;
}

async function initAction(options: InitOptions) {
	const { force, outputDir } = options;
	const umi = createUmi(defaultRpcURLs.mainnet);
	const logger = globalLogger.getSubLogger({ name: 'init' });

	async function generate(outputFile: string) {
		const file = Bun.file(outputFile);
		if (!force && (await file.exists())) {
			logger.info('File', outputFile, 'already exists, skipping');
			return;
		}

		const keypair = umi.eddsa.generateKeypair();
		const jsonable = {
			publicKey: keypair.publicKey,
			secretKey: [...keypair.secretKey],
		};

		await file.write(JSON.stringify(jsonable, null, 2));
		logger.info('Wrote', outputFile);
	}

	const keypairs = ['deployer'].map((name) => resolve(outputDir, `${name}.json`));
	const jobs = keypairs.map(generate);
	await Promise.all(jobs);
}

export function registerInitCommand(program: Command) {
	program
		.command('init')
		.description('Initialize keypairs for deployment')
		.option('-f, --force', 'Forcefully write new keypairs', false)
		.option('-o, --output-dir <dir>', 'Keypairs output directory', './secrets')
		.action(initAction);
}
