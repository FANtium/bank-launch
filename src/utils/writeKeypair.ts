import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Keypair } from '@metaplex-foundation/umi';

export default async function writeKeypair(path: string, keypair: Keypair): Promise<void> {
	await mkdir(dirname(path), { recursive: true });

	const jsonable = {
		publicKey: keypair.publicKey,
		secretKey: [...keypair.secretKey],
	};

	await Bun.write(path, JSON.stringify(jsonable, null, 2));
}
