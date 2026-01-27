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
	const keypair = await getKeypair('deployer');
	umi.use(keypairIdentity(keypair, true));

	const seed32 = createHash('sha256').update(SEED).digest();
	const baseMint = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSeed(seed32));

	const [genesisAccount] = findGenesisAccountV2Pda(umi, {
		baseMint: baseMint.publicKey,
		genesisIndex: 0,
	});

	console.log('Genesis account:', genesisAccount.toString());
	const genesisData = await fetchGenesisAccountV2(umi, genesisAccount);
	console.log(
		'Genesis state:',
		JSON.stringify(genesisData, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
	);
	console.log();

	// Fetch detailed bucket data
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

	for (const bucket of buckets) {
		console.log(`\n=== ${bucket.name} (${bucket.type}) ===`);
		console.log(`PDA: ${bucket.pda}`);

		try {
			let data: unknown;
			if (bucket.type === 'unlocked') {
				data = await fetchUnlockedBucketV2(umi, bucket.pda);
			} else if (bucket.type === 'launchPool') {
				data = await fetchLaunchPoolBucketV2(umi, bucket.pda);
			} else if (bucket.type === 'raydium') {
				data = await fetchRaydiumCpmmBucketV2(umi, bucket.pda);
			} else if (bucket.type === 'streamflow') {
				data = await fetchStreamflowBucketV2(umi, bucket.pda);
			}

			console.log(
				'Full data:',
				JSON.stringify(
					data,
					(_, v) => {
						if (typeof v === 'bigint') return v.toString();
						if (v instanceof Uint8Array) return `[Uint8Array(${v.length})]`;
						return v;
					},
					2,
				),
			);
		} catch (e) {
			console.log(`Error fetching: ${e}`);
		}
	}
}

main().catch(console.error);
