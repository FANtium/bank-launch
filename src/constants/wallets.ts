import { type PublicKey, publicKey } from '@metaplex-foundation/umi';

type Wallets = Record<'treasury' | 'bankroll' | 'marketing' | 'liquidity', PublicKey>;

export const devnet: Wallets = {
	treasury: publicKey('DiC7zncfcUWthnBCQtfgNJE3tMQC6GfGT1atuYrN9BrP'),
	bankroll: publicKey('FuN9eyr6rJKWJoUjC53xhVMYAWT3YPK65HsjnJPGyaFX'),
	marketing: publicKey('B5ubKXMzP1iHyC28417eM9KWZsWvgREifJXKT7WdyfWX'),
	liquidity: publicKey('7cSKqRCreK2jYGHHnqNUBr4YrPu959wp1DyUe6gxyb6i'),
};

export const mainnet: Wallets = {
	treasury: publicKey('E2J2AZas4mYScUQWicem5bBDh4mFvQ6Y6umkxVanKbMR'),
	bankroll: publicKey('E2J2AZas4mYScUQWicem5bBDh4mFvQ6Y6umkxVanKbMR'),
	marketing: publicKey('E2J2AZas4mYScUQWicem5bBDh4mFvQ6Y6umkxVanKbMR'),
	liquidity: publicKey('E2J2AZas4mYScUQWicem5bBDh4mFvQ6Y6umkxVanKbMR'),
};

export const walletsMap = { local: devnet, devnet, mainnet };
