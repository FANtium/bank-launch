import { Command, Option } from '@commander-js/extra-typings';
import { $, Glob } from 'bun';
import globalLogger from '@/lib/logging/globalLogger';
import surfpoolRpcCall from './surfpoolRpcCall';

async function getAirdropPublicKeys(): Promise<string[]> {
	const glob = new Glob(`secrets/user*.json`);
	const publicKeys: string[] = [];

	for await (const path of glob.scan('.')) {
		const file = Bun.file(path);
		const content = await file.json();
		if (content.publicKey) {
			publicKeys.push(content.publicKey);
		}
	}

	return publicKeys;
}

const surfpoolStartCommand = new Command('start')
	.description('Start the surfpool local validator connected to devnet')
	.addOption(new Option('--tui', 'Enable terminal UI mode (default)').default(true).conflicts('noTui'))
	.addOption(new Option('--no-tui', 'Disable terminal UI mode and run in background'))
	.action(async (options) => {
		const args = ['-n', 'devnet'];

		if (!options.tui) {
			args.push('--no-tui');
		}

		const publicKeys = await getAirdropPublicKeys();
		for (const publicKey of publicKeys) {
			args.push('--airdrop', publicKey);
		}

		globalLogger.info('Starting surfpool with args:', args.join(' '));
		await $`surfpool start ${args}`;
	});

const surfpoolResetCommand = new Command('reset')
	.description('Reset the surfpool validator state (clears all accounts and restarts from devnet snapshot)')
	.action(async () => {
		try {
			const result = await surfpoolRpcCall('surfnet_resetNetwork');
			globalLogger.info('Surfpool reset successful:', result);
		} catch (error) {
			globalLogger.error('Failed to reset surfpool:', error);
			process.exit(1);
		}
	});

const surfpoolStopCommand = new Command('stop')
	.description('Stop all running surfpool validator processes')
	.action(async () => {
		try {
			await $`pkill -9 -f surfpool || true`;
			globalLogger.info('Surfpool stopped');
		} catch {
			// pkill returns non-zero if no processes found, which is fine
			globalLogger.info('No surfpool processes found');
		}
	});

const surfpoolCommand = new Command('surfpool')
	.description('Manage the surfpool local Solana validator for development and testing')
	.addCommand(surfpoolStartCommand)
	.addCommand(surfpoolResetCommand)
	.addCommand(surfpoolStopCommand);

export default surfpoolCommand;
