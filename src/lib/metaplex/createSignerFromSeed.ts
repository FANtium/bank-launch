import { createHash } from 'node:crypto';
import { type Context, createSignerFromKeypair, type KeypairSigner } from '@metaplex-foundation/umi';

export default function createSignerFromSeed(context: Pick<Context, 'eddsa'>, seed: string): KeypairSigner {
	// Hash the seed string to get exactly 32 bytes (SHA-256 output)
	const seed32 = createHash('sha256').update(seed).digest();
	return createSignerFromKeypair(context, context.eddsa.createKeypairFromSeed(seed32));
}
