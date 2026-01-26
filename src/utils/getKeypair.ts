import type { Keypair } from '@metaplex-foundation/umi';

export default async function getKeypair(name: string) {
	const path = `./secrets/${name}.json`;
	const file = Bun.file(path);

	if (!(await file.exists())) {
		throw new Error(`Signer file not found: ${path}`);
	}

	const content = await file.json();
	const keypair: Keypair = {
		publicKey: content.publicKey,
		secretKey: Uint8Array.from(content.secretKey),
	};

	return keypair;
}
