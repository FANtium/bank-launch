import type { KnipConfig } from 'knip';

const config: KnipConfig = {
	entry: ['./scripts/**/*.ts', './bank', './src/commands/*/command.ts'],
};

export default config;
