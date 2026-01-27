import { createHash } from 'node:crypto';
import {
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
const GENESIS_PROGRAM_ID = 'GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B';

async function main() {
	const umi = createUmi('local');
	const keypair = await getKeypair('deployer');
	umi.use(keypairIdentity(keypair, true));

	// Hash the seed string to get exactly 32 bytes (SHA-256 output)
	const seed32 = createHash('sha256').update(SEED).digest();
	const baseMint = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSeed(seed32));

	// Genesis account
	const [genesisAccount] = findGenesisAccountV2Pda(umi, {
		baseMint: baseMint.publicKey,
		genesisIndex: 0,
	});

	console.log('Genesis program ID:', GENESIS_PROGRAM_ID);
	console.log('Genesis account:', genesisAccount.toString());
	console.log();

	// Define bucket PDAs
	const buckets = [
		{ name: 'privateSaleUnlocked', pda: findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0] },
		{ name: 'publicSaleUnlocked', pda: findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 1 })[0] },
		{ name: 'publicSaleLaunchPool', pda: findLaunchPoolBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0] },
		{ name: 'raydiumCpmm', pda: findRaydiumCpmmBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0] },
		{ name: 'bankrollUnlocked', pda: findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 2 })[0] },
		{ name: 'marketingStreamflow', pda: findStreamflowBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0] },
		{ name: 'liquidityUnlocked', pda: findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 3 })[0] },
		{ name: 'treasuryStreamflow', pda: findStreamflowBucketV2Pda(umi, { genesisAccount, bucketIndex: 1 })[0] },
	];

	// Check genesis account owner first
	const genesisAccountInfo = await umi.rpc.getAccount(genesisAccount);
	if (genesisAccountInfo.exists) {
		console.log('Genesis account owner:', genesisAccountInfo.owner.toString());
		console.log('Owner matches Genesis program:', genesisAccountInfo.owner.toString() === GENESIS_PROGRAM_ID);
	} else {
		console.log('Genesis account does not exist!');
	}
	console.log();

	console.log('Bucket account owners:');
	for (const bucket of buckets) {
		const accountInfo = await umi.rpc.getAccount(bucket.pda);
		if (accountInfo.exists) {
			const owner = accountInfo.owner.toString();
			const isGenesisOwned = owner === GENESIS_PROGRAM_ID;
			console.log(`  ${bucket.name}:`);
			console.log(`    PDA: ${bucket.pda}`);
			console.log(`    Owner: ${owner}`);
			console.log(`    Owned by Genesis: ${isGenesisOwned ? 'YES' : 'NO'}`);
			if (!isGenesisOwned) {
				console.log(`    ⚠️ WRONG OWNER!`);
			}
		} else {
			console.log(`  ${bucket.name}: DOES NOT EXIST`);
		}
	}
}

main().catch(console.error);
