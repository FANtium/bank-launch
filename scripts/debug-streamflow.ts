import { createHash } from 'node:crypto';
import {
	fetchGenesisAccountV2,
	fetchStreamflowBucketV2,
	findGenesisAccountV2Pda,
	findStreamflowBucketV2Pda,
} from '@metaplex-foundation/genesis';
import { createSignerFromKeypair, keypairIdentity } from '@metaplex-foundation/umi';
import createUmi from '../src/lib/metaplex/createUmi';
import getKeypair from '../src/utils/getKeypair';

const SEED = 'bank-launch';

async function main() {
	const umi = createUmi('local');
	const keypair = await getKeypair('user-deployer');
	umi.use(keypairIdentity(keypair, true));

	// Hash the seed string to get exactly 32 bytes (SHA-256 output)
	const seed32 = createHash('sha256').update(SEED).digest();
	const baseMint = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSeed(seed32));

	// Genesis account
	const [genesisAccount] = findGenesisAccountV2Pda(umi, {
		baseMint: baseMint.publicKey,
		genesisIndex: 0,
	});

	console.log('Genesis account:', genesisAccount.toString());
	console.log('Base mint:', baseMint.publicKey.toString());

	// Try to fetch genesis account
	try {
		const rawGenesisAccount = await umi.rpc.getAccount(genesisAccount);
		if (rawGenesisAccount.exists) {
			const keyByte = rawGenesisAccount.data[0];
			console.log('\nGenesis account raw key byte:', keyByte, '(expected: 18 for GenesisAccountV2)');
		}

		const genesisData = await fetchGenesisAccountV2(umi, genesisAccount);
		console.log('\nGenesis account data:');
		console.log('  bucketCount:', genesisData.bucketCount);
		console.log('  finalized:', genesisData.finalized);
		console.log('  authority:', genesisData.authority);
	} catch (e) {
		console.log('Failed to fetch genesis account:', e);
		return;
	}

	// Check streamflow bucket at index 0
	console.log('\n--- Streamflow Bucket at index 0 ---');
	const [streamflowBucket] = findStreamflowBucketV2Pda(umi, {
		genesisAccount,
		bucketIndex: 0,
	});
	console.log('PDA:', streamflowBucket.toString());

	try {
		// Get raw account data first to check discriminator
		const rawAccount = await umi.rpc.getAccount(streamflowBucket);
		if (!rawAccount.exists) {
			console.log('Account does not exist!');
			return;
		}

		const keyByte = rawAccount.data[0];
		console.log('Key discriminator:', keyByte, '(expected: 28 for StreamflowBucketV2)');

		// Fetch the structured data
		const bucketData = await fetchStreamflowBucketV2(umi, streamflowBucket);
		console.log('Bucket data:');
		console.log('  bucket.bucketIndex:', bucketData.bucket.bucketIndex);
		console.log('  bucket.genesis:', bucketData.bucket.genesis);
		console.log('  bucket.bump:', bucketData.bucket.bump);
		console.log('  bucket.feeType:', JSON.stringify(bucketData.bucket.feeType));

		// Byte-level comparison of genesis
		const storedGenesisBytes = Buffer.from(bucketData.bucket.genesis as unknown as Uint8Array);
		const expectedGenesisBytes = Buffer.from(genesisAccount as unknown as Uint8Array);
		const bytesMatch = storedGenesisBytes.equals(expectedGenesisBytes);
		console.log('  Genesis match (bytes):', bytesMatch ? 'YES' : 'NO');
	} catch (e) {
		console.log('Failed to fetch streamflow bucket:', e);
	}
}

main().catch(console.error);
