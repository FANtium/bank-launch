import { createHash } from 'node:crypto';
import {
	fetchGenesisAccountV2,
	fetchLaunchPoolBucketV2,
	fetchRaydiumCpmmBucketV2,
	fetchStreamflowBucketV2,
	fetchUnlockedBucketV2,
	findGenesisAccountV2Pda,
	findLaunchPoolBucketV2Pda,
	findRaydiumCpmmBucketV2Pda,
	findStreamflowBucketV2Pda,
	findUnlockedBucketV2Pda,
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
		// Get raw account data first to check discriminator
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
		console.log('  totalSupplyBaseToken:', genesisData.totalSupplyBaseToken.toString());
		console.log('  totalAllocatedSupplyBaseToken:', genesisData.totalAllocatedSupplyBaseToken.toString());
	} catch (e) {
		console.log('Failed to fetch genesis account:', e);
		return;
	}

	// Define bucket PDAs with type info for fetching
	const buckets = [
		{
			name: 'privateSaleUnlocked',
			type: 'unlocked',
			pda: findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0],
		},
		{
			name: 'publicSaleUnlocked',
			type: 'unlocked',
			pda: findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 1 })[0],
		},
		{
			name: 'publicSaleLaunchPool',
			type: 'launchPool',
			pda: findLaunchPoolBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0],
		},
		{
			name: 'raydiumCpmm',
			type: 'raydium',
			pda: findRaydiumCpmmBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0],
		},
		{
			name: 'bankrollUnlocked',
			type: 'unlocked',
			pda: findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 2 })[0],
		},
		{
			name: 'marketingStreamflow',
			type: 'streamflow',
			pda: findStreamflowBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0],
		},
		{
			name: 'liquidityUnlocked',
			type: 'unlocked',
			pda: findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 3 })[0],
		},
		{
			name: 'treasuryStreamflow',
			type: 'streamflow',
			pda: findStreamflowBucketV2Pda(umi, { genesisAccount, bucketIndex: 1 })[0],
		},
	];

	// Key discriminator values for V2 bucket types
	const KEY_TYPES: Record<number, string> = {
		21: 'UnlockedBucketV2',
		22: 'RaydiumCpmmBucketV2',
		26: 'LaunchPoolBucketV2',
		28: 'StreamflowBucketV2',
	};

	console.log('\nBucket PDAs with internal bucketIndex and key discriminators:');
	for (let i = 0; i < buckets.length; i++) {
		const bucket = buckets[i];
		if (!bucket) continue;
		try {
			// First fetch raw account data to check key discriminator
			const accountInfo = await umi.rpc.getAccount(bucket.pda);
			let keyByte = -1;
			if (accountInfo.exists && accountInfo.data) {
				keyByte = accountInfo.data[0] ?? -1; // First byte is the key discriminator
			}

			let bucketData: { bucket: { bucketIndex: number; genesis: string; bump: number; feeType: unknown } } | null =
				null;

			// Fetch bucket data based on type
			if (bucket.type === 'unlocked') {
				bucketData = await fetchUnlockedBucketV2(umi, bucket.pda);
			} else if (bucket.type === 'launchPool') {
				bucketData = await fetchLaunchPoolBucketV2(umi, bucket.pda);
			} else if (bucket.type === 'raydium') {
				bucketData = await fetchRaydiumCpmmBucketV2(umi, bucket.pda);
			} else if (bucket.type === 'streamflow') {
				bucketData = await fetchStreamflowBucketV2(umi, bucket.pda);
			}

			if (bucketData) {
				const internalIndex = bucketData.bucket.bucketIndex;
				const storedGenesis = bucketData.bucket.genesis;
				const bump = bucketData.bucket.bump;
				const feeType = bucketData.bucket.feeType;

				// Byte-level comparison of genesis
				const storedGenesisBytes = Buffer.from(storedGenesis as unknown as Uint8Array);
				const expectedGenesisBytes = Buffer.from(genesisAccount as unknown as Uint8Array);
				const bytesMatch = storedGenesisBytes.equals(expectedGenesisBytes);

				console.log(`  ${i}: ${bucket.name}`);
				console.log(`     PDA: ${bucket.pda}`);
				console.log(`     Key discriminator: ${keyByte} (${KEY_TYPES[keyByte] || 'UNKNOWN'})`);
				console.log(`     Bump: ${bump}`);
				console.log(`     FeeType: ${JSON.stringify(feeType)}`);
				console.log(`     Internal bucketIndex: ${internalIndex}`);
				console.log(`     Stored genesis: ${storedGenesis}`);
				console.log(`     Expected genesis: ${genesisAccount}`);
				console.log(`     Genesis match (string): ${storedGenesis === genesisAccount ? 'YES' : 'NO'}`);
				console.log(`     Genesis match (bytes): ${bytesMatch ? 'YES' : 'NO'}`);
			}
		} catch (e) {
			console.log(`  ${i}: ${bucket.name} - ERROR: ${e}`);
		}
	}

	// Now print buckets sorted by internal bucketIndex
	console.log('\n\n=== Buckets sorted by internal bucketIndex (expected finalize order) ===');
	const bucketDataArray: Array<{ name: string; pda: string; internalIndex: number }> = [];

	for (const bucket of buckets) {
		try {
			let bucketData: { bucket: { bucketIndex: number } } | null = null;

			if (bucket.type === 'unlocked') {
				bucketData = await fetchUnlockedBucketV2(umi, bucket.pda);
			} else if (bucket.type === 'launchPool') {
				bucketData = await fetchLaunchPoolBucketV2(umi, bucket.pda);
			} else if (bucket.type === 'raydium') {
				bucketData = await fetchRaydiumCpmmBucketV2(umi, bucket.pda);
			} else if (bucket.type === 'streamflow') {
				bucketData = await fetchStreamflowBucketV2(umi, bucket.pda);
			}

			if (bucketData) {
				bucketDataArray.push({
					name: bucket.name,
					pda: bucket.pda.toString(),
					internalIndex: bucketData.bucket.bucketIndex,
				});
			}
		} catch (e) {
			console.log(`Failed to fetch ${bucket.name}: ${e}`);
		}
	}

	// Sort by internal bucketIndex
	bucketDataArray.sort((a, b) => a.internalIndex - b.internalIndex);

	for (const b of bucketDataArray) {
		console.log(`  ${b.internalIndex}: ${b.name} - ${b.pda}`);
	}
}

main().catch(console.error);
