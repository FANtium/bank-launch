import { createHash } from 'node:crypto';
import {
	fetchGenesisAccountV2,
	finalizeV2,
	findGenesisAccountV2Pda,
	findLaunchPoolBucketV2Pda,
	findRaydiumCpmmBucketV2Pda,
	findStreamflowBucketV2Pda,
	findUnlockedBucketV2Pda,
} from '@metaplex-foundation/genesis';
import { createSignerFromKeypair, keypairIdentity } from '@metaplex-foundation/umi';
import createUmi from '../src/lib/createUmi';
import getKeypair from '../src/utils/getKeypair';

const SEED = 'bank-launch';

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

	console.log('Genesis account:', genesisAccount.toString());
	console.log('Base mint:', baseMint.publicKey.toString());

	// Check genesis account state
	const genesisData = await fetchGenesisAccountV2(umi, genesisAccount);
	console.log('Genesis bucketCount:', genesisData.bucketCount);
	console.log('Genesis finalized:', genesisData.finalized);

	// Build bucket PDAs
	const buckets = [
		findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0],
		findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 1 })[0],
		findLaunchPoolBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0],
		findRaydiumCpmmBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0],
		findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 2 })[0],
		findStreamflowBucketV2Pda(umi, { genesisAccount, bucketIndex: 0 })[0],
		findUnlockedBucketV2Pda(umi, { genesisAccount, bucketIndex: 3 })[0],
		findStreamflowBucketV2Pda(umi, { genesisAccount, bucketIndex: 1 })[0],
	];

	console.log('\nBuckets to pass:');
	for (const [i, b] of buckets.entries()) {
		console.log(`  ${i}: ${b}`);
	}

	// Build remaining accounts
	const remainingAccounts = buckets.map((pubkey) => ({
		pubkey,
		isSigner: false,
		isWritable: true,
	}));

	// Build the finalize transaction
	const builder = finalizeV2(umi, {
		genesisAccount,
		baseMint: baseMint.publicKey,
	}).addRemainingAccounts(remainingAccounts);

	// Get the instruction
	const instructions = builder.getInstructions();
	const ix = instructions[0];

	if (!ix) {
		console.log('No instruction found');
		return;
	}

	console.log('\n=== Finalize Instruction ===');
	console.log('Program ID:', ix.programId);
	console.log('Instruction data (hex):', Buffer.from(ix.data).toString('hex'));
	console.log('Instruction data length:', ix.data.length);

	console.log('\nAccounts:');
	for (const [i, key] of ix.keys.entries()) {
		console.log(`  ${i}: ${key.pubkey} (signer: ${key.isSigner}, writable: ${key.isWritable})`);
	}

	// Try to simulate the transaction
	console.log('\n=== Simulating transaction ===');
	try {
		const tx = await builder.buildAndSign(umi);
		const result = await umi.rpc.simulateTransaction(tx);
		console.log('Simulation result:', result);
	} catch (e) {
		console.log('Simulation error:', e);
	}
}

main().catch(console.error);
