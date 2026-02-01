import { publicKey } from '@metaplex-foundation/umi';

export const WSOL_MINT = publicKey('So11111111111111111111111111111111111111112');
export const BANK_DECIMALS = 9;
export const BANK_TOTAL_SUPPLY = 100_000_000n * 10n ** BigInt(BANK_DECIMALS); // 100 million tokens (9 decimals)
