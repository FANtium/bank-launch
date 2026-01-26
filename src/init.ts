import { resolve } from 'node:path';
import { Command } from '@commander-js/extra-typings';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { defaultRpcURLs } from '@/constants/rpc';
import globalLogger from '@/logging/globalLogger';

const program = new Command()
	.option('-f, --force', 'Forcefully write new keypairs', false)
	.option('-o --output-dir <dir>', 'Keypairs output directory', './secrets')
	.parse();

const { force, outputDir } = program.opts();
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
