import { createHash } from 'node:crypto';
import {
	addLaunchPoolBucketV2,
	addRaydiumCpmmBucketV2,
	addUnlockedBucketV2,
	behavior,
	finalizeV2,
	findGenesisAccountV2Pda,
	initializeV2,
} from '@metaplex-foundation/genesis';
import {
	base58,
	createSignerFromKeypair,
	type Keypair,
	type KeypairSigner,
	type PublicKey,
	signerIdentity,
	type TransactionBuilder,
} from '@metaplex-foundation/umi';
import { addHours } from 'date-fns/addHours';
import { addYears } from 'date-fns/addYears';
import { getUnixTime } from 'date-fns/getUnixTime';
import { BANK_DECIMALS, BANK_TOTAL_SUPPLY, WSOL_MINT } from '@/constants/token';
import addStreamflowBucketVX from '@/lib/addStreamflowBucketVX';
import getBuckets from '@/lib/buckets';
import createUmi from '@/lib/createUmi';
import getTimeline from '@/lib/getTimeline';
import globalLogger from '@/logging/globalLogger';
import type Cluster from '@/types/Cluster';
import getKeypair from '@/utils/getKeypair';
import supplyShareBps from '@/utils/supplyShareBps';
import timeAbsolute from '@/utils/timeAbsolute';

type LaunchOptions = {
	cluster: Cluster;
	wallets: {
		treasury: PublicKey;
		bankroll: PublicKey;
		liquidity: PublicKey;
		marketing: PublicKey;
	};
	timeline: {
		publicSaleStart: Date;
	};

	send: boolean;
} & ({ baseMint: Keypair | KeypairSigner } | { seed: string });

export default async function launchBank(options: LaunchOptions) {
	const logger = globalLogger.getSubLogger({ name: 'launchBank' });

	const { cluster, wallets, timeline, send } = options;
	const umi = createUmi(cluster);
	const keypair = await getKeypair('deployer');
	const backendSigner = createSignerFromKeypair(umi, keypair);
	umi.use(signerIdentity(backendSigner));

	const baseMint = (() => {
		if ('baseMint' in options) {
			return createSignerFromKeypair(umi, options.baseMint);
		} else {
			// Hash the seed string to get exactly 32 bytes (SHA-256 output)
			const seed = createHash('sha256').update(options.seed).digest();
			const keypair = umi.eddsa.createKeypairFromSeed(seed);
			return createSignerFromKeypair(umi, keypair);
		}
	})();

	logger.info(`Using base mint: ${baseMint.publicKey}`);

	logger.info(`Using signer: ${umi.identity.publicKey}`);

	const [genesisAccount] = findGenesisAccountV2Pda(umi, {
		baseMint: baseMint.publicKey,
		genesisIndex: 0,
	});
	logger.info(`Using genesis account: ${genesisAccount}`);

	const common = {
		genesisAccount,
		baseMint: baseMint.publicKey,
		backendSigner: {
			signer: umi.identity.publicKey,
		},
	} as const;

	const buckets = getBuckets(umi, genesisAccount);
	const { publicSaleStart, publicSaleEnd, claimStart, claimEnd } = getTimeline(timeline.publicSaleStart);

	const transactions: { description: string; transaction: TransactionBuilder }[] = [];

	transactions.push({
		description: 'Initialize bank token',
		transaction: initializeV2(umi, {
			baseMint,
			quoteMint: WSOL_MINT,
			fundingMode: 0,
			totalSupplyBaseToken: BANK_TOTAL_SUPPLY,

			name: 'Bank Token',
			symbol: 'BANK',
			uri: 'https://fanstrike.fun/bank',
			decimals: BANK_DECIMALS,
		}),
	});

	// Private sale, unlocked bucket with a 10% allocation
	// Will be airdropped to investors outside of Metaplex Genesis
	transactions.push({
		description: 'Add private sale unlocked bucket',
		transaction: addUnlockedBucketV2(umi, {
			...common,
			bucketIndex: buckets.privateSaleUnlockedBucketIndex,
			baseTokenAllocation: supplyShareBps(1000), // 10% of the total supply
			claimStartCondition: timeAbsolute(claimStart),
			claimEndCondition: timeAbsolute(claimEnd),
			recipient: wallets.treasury,
		}),
	});

	// Public sale, via MetaPlex LaunchPool, 5% allocation
	// 80% of the raised quote token goes to unlocked bucket
	// 20% to Raydium CPMM bucket that will seed liquidity
	transactions.push({
		description: 'Add public sale unlocked bucket',
		transaction: addUnlockedBucketV2(umi, {
			...common,
			bucketIndex: buckets.publicSaleUnlockedBucketIndex,
			baseTokenAllocation: supplyShareBps(0),
			claimStartCondition: timeAbsolute(claimStart),
			claimEndCondition: timeAbsolute(claimEnd),
			recipient: wallets.treasury,
		}),
	});

	transactions.push({
		description: 'Add public sale launch pool bucket',
		transaction: addLaunchPoolBucketV2(umi, {
			...common,
			bucketIndex: buckets.publicSaleLaunchPoolBucketIndex,

			baseTokenAllocation: supplyShareBps(500), // 5% of the total supply

			// 25% bonus at publicSaleStart, decreasing linearly to 0% over 24h
			bonusSchedule: {
				maxBps: 2500, // capped at 25%
				interceptBps: 7500, // starts at 75% but everything capped at 25%
				slopeBps: -10000, // this large negative slope makes it hit 0 at t=36 hours
				startTime: getUnixTime(publicSaleStart),
				endTime: getUnixTime(addHours(publicSaleStart, 24)),
			},

			withdrawPenalty: {
				maxBps: 10000, // capped at 100% but wasn't used, could have still been 25%
				interceptBps: -7500, // starts at -75% but everything capped at 0%
				slopeBps: 10000, // this large positive slope makes it hit 0 at t=36 hours
				startTime: getUnixTime(publicSaleStart),
				endTime: getUnixTime(addHours(publicSaleStart, 48)),
			},
			penaltyWallet: wallets.treasury,

			// Optional: Deposit limits
			minimumDepositAmount: null, // or { amount: sol(0.1).basisPoints }
			depositLimit: null, // or { limit: sol(10).basisPoints }

			// Timing
			depositStartCondition: timeAbsolute(publicSaleStart),
			depositEndCondition: timeAbsolute(publicSaleEnd),
			claimStartCondition: timeAbsolute(claimStart),
			claimEndCondition: timeAbsolute(claimEnd),

			// Where collected SOL goes after transition
			endBehaviors: [
				// 80% to unlocked bucket
				behavior('SendQuoteTokenPercentage', {
					padding: Array(4).fill(0),
					destinationBucket: buckets.publicSaleUnlockedBucket,
					percentageBps: 8000, // 80%
					processed: false,
				}),

				// 20% to Raydium CPMM bucket
				behavior('SendQuoteTokenPercentage', {
					padding: Array(4).fill(0),
					destinationBucket: buckets.raydiumBucket,
					percentageBps: 2000, // 20%
					processed: false,
				}),
			],
		}),
	});

	// Raydium CPMM bucket, 2% allocation
	// Quote liquidity is seeded from public sale
	transactions.push({
		description: 'Add Raydium CPMM bucket',
		transaction: addRaydiumCpmmBucketV2(umi, {
			...common,
			bucketIndex: buckets.raydiumCpmmBucketIndex,
			baseTokenAllocation: supplyShareBps(200), // 2% of the total supply
			startCondition: timeAbsolute(publicSaleEnd),
		}),
	});

	// Bankroll, 25% unlocked and will be holder-governed later
	transactions.push({
		description: 'Add bankroll unlocked bucket',
		transaction: addUnlockedBucketV2(umi, {
			...common,
			bucketIndex: buckets.bankrollUnlockedBucketIndex,
			baseTokenAllocation: supplyShareBps(2500), // 25% of the total supply
			recipient: wallets.bankroll,
			claimStartCondition: timeAbsolute(claimStart),
			claimEndCondition: timeAbsolute(claimEnd),
		}),
	});

	// Marketing and collaborations, 15% allocation
	// Vesting over 12 months, 25% unlocked at claim start
	const marketingBps = 1500; // 15% of the total supply
	transactions.push({
		description: 'Add marketing unlocked bucket',
		transaction: addUnlockedBucketV2(umi, {
			...common,
			bucketIndex: buckets.marketingUnlockedBucketIndex,
			baseTokenAllocation: supplyShareBps(marketingBps * 0.25), // 3.75% of the total supply (25% of the 15% marketing allocation)
			recipient: wallets.marketing,
			claimStartCondition: timeAbsolute(claimStart),
			claimEndCondition: timeAbsolute(claimEnd),
		}),
	});

	transactions.push({
		description: 'Add marketing streamflow bucket',
		transaction: addStreamflowBucketVX(umi, {
			...common,
			bucketIndex: buckets.marketingStreamflowBucketIndex,
			baseTokenAllocation: supplyShareBps(marketingBps * 0.75), // 11.25% of the total supply (75% of the 15% marketing allocation)
			recipient: wallets.marketing,
			config: {
				streamName: Buffer.from('Marketing Streamflow'),
				startTime: getUnixTime(claimStart),
				endTime: getUnixTime(addYears(claimStart, 1)),
			},
			lockStartCondition: timeAbsolute(claimStart),
			lockEndCondition: timeAbsolute(addYears(claimStart, 1)),
		}),
	});

	// Liquidity management, 23% allocation, 100% unlocked
	transactions.push({
		description: 'Add liquidity management unlocked bucket',
		transaction: addUnlockedBucketV2(umi, {
			...common,
			bucketIndex: buckets.liquidityManagementUnlockedBucketIndex,
			baseTokenAllocation: supplyShareBps(2300), // 23% of the total supply
			recipient: wallets.liquidity,
			claimStartCondition: timeAbsolute(claimStart),
			claimEndCondition: timeAbsolute(claimEnd),
		}),
	});

	// Treasury, 20% allocation
	// Vesting over 24 months, 25% unlocked at claim start
	transactions.push({
		description: 'Add treasury unlocked bucket',
		transaction: addUnlockedBucketV2(umi, {
			...common,
			bucketIndex: buckets.treasuryUnlockedBucketIndex,
			baseTokenAllocation: supplyShareBps(500), // 5% of the total supply
			claimStartCondition: timeAbsolute(claimStart),
			claimEndCondition: timeAbsolute(claimEnd),
			recipient: wallets.treasury,
		}),
	});

	transactions.push({
		description: 'Add treasury streamflow bucket',
		transaction: addStreamflowBucketVX(umi, {
			...common,
			bucketIndex: buckets.treasuryStreamflowBucketIndex,
			baseTokenAllocation: supplyShareBps(1500), // 15% of the total supply
			recipient: wallets.treasury,
			config: {
				streamName: Buffer.from('Treasury Streamflow'),
				startTime: getUnixTime(claimStart),
				endTime: getUnixTime(addYears(claimStart, 2)),
			},
			lockStartCondition: timeAbsolute(claimStart),
			lockEndCondition: timeAbsolute(addYears(claimStart, 2)),
		}),
	});

	transactions.push({
		description: 'Finalize Genesis',
		transaction: finalizeV2(umi, {
			genesisAccount,
			baseMint: common.baseMint,
		}),
	});

	// Return all prepared transactions
	logger.info(`Prepared ${transactions.length} transactions for bank launch`);
	for (const [index, { description }] of transactions.entries()) {
		const progress = index + 1;
		logger.info(`${progress}. ${description}`);
	}

	if (send) {
		for (const [index, { description, transaction }] of transactions.entries()) {
			const progress = index + 1;
			logger.info(`Sending transaction ${progress}/${transactions.length}: ${description}`);
			const result = await transaction.sendAndConfirm(umi);
			const [signature] = base58.deserialize(result.signature);
			logger.info(`Transaction sent: ${signature}`);
		}
	}

	return transactions;
}
