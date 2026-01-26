import { createHash } from 'node:crypto';
import { Command, Option } from '@commander-js/extra-typings';
import { findGenesisAccountV2Pda } from '@metaplex-foundation/genesis';
import { createSignerFromKeypair, keypairIdentity } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { walletsMap } from '@/constants/wallets';
import initialize from '@/launch/01_initialize';
import privateSale from '@/launch/02_privateSale';
import publicSale from '@/launch/03_publicSale';
import raydiumCpmm from '@/launch/04_raydiumCpmm';
import bankroll from '@/launch/05_bankroll';
import marketing from '@/launch/06_marketing';
import liquidity from '@/launch/07_liquidity';
import treasury from '@/launch/08_treasury';
import finalize from '@/launch/09_finalize';
import getBuckets from '@/lib/buckets';
import createUmi from '@/lib/createUmi';
import getTimeline from '@/lib/getTimeline';
import globalLogger from '@/logging/globalLogger';
import getKeypair from '@/utils/getKeypair';

const logger = globalLogger.getSubLogger({ name: 'launch' });
const program = new Command()
	.addOption(
		new Option('-c, --cluster <cluster>', 'Cluster to connect to')
			.choices(['local', 'devnet', 'mainnet'])
			.default('devnet'),
	)
	.option('-s, --send', 'Send the transactions', false)
	.option('--seed <seed>', 'Seed for mint derivation', 'bank-launch')
	.parse();

const { cluster, send, seed } = program.opts();

logger.info(`Launching on cluster: ${cluster} (send: ${send})`);

// Umi setup
const umi = createUmi(cluster);
const keypair = await getKeypair('deployer');
umi.use(keypairIdentity(keypair, true));
logger.info(`Using deployer: ${umi.identity.publicKey}`);

// Hash the seed string to get exactly 32 bytes (SHA-256 output)
const seed32 = createHash('sha256').update(seed).digest();
const baseMint = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSeed(seed32));

// Genesis account
const [genesisAccount] = findGenesisAccountV2Pda(umi, {
	baseMint: baseMint.publicKey,
	genesisIndex: 0,
});

const common = {
	baseMint: baseMint.publicKey,
	genesisAccount,
	backendSigner: {
		signer: umi.identity.publicKey,
	},
};

// Buckets
const bucket = getBuckets(umi, genesisAccount);
const timeline = getTimeline(new Date());
const wallets = walletsMap[cluster];

const steps = [
	initialize(umi, { ...common }),
	privateSale(umi, {
		...common,
		unlockedBucket: {
			bucketIndex: bucket.privateSaleUnlockedBucketIndex,
			recipient: wallets.treasury,
		},
		timeline: {
			claimStart: timeline.claimStart,
			claimEnd: timeline.claimEnd,
		},
	}),
	publicSale(umi, {
		...common,
		unlockedBucket: {
			bucketIndex: bucket.publicSaleUnlockedBucketIndex,
			recipient: wallets.treasury,
		},
		launchpoolBucket: {
			bucketIndex: bucket.publicSaleLaunchPoolBucketIndex,
			penaltyWallet: wallets.treasury,
		},
		timeline: {
			claimStart: timeline.claimStart,
			claimEnd: timeline.claimEnd,
			publicSaleStart: timeline.publicSaleStart,
			publicSaleEnd: timeline.publicSaleEnd,
		},
		buckets: {
			publicSaleUnlockedBucket: bucket.publicSaleUnlockedBucket,
			raydiumBucket: bucket.raydiumBucket,
		},
	}),
	raydiumCpmm(umi, {
		...common,
		raydiumCpmm: {
			bucketIndex: bucket.raydiumCpmmBucketIndex,
		},
		timeline: {
			start: timeline.claimStart,
		},
	}),
	bankroll(umi, {
		...common,
		unlockedBucket: {
			bucketIndex: bucket.bankrollUnlockedBucketIndex,
			recipient: wallets.bankroll,
		},
		timeline: {
			claimStart: timeline.claimStart,
			claimEnd: timeline.claimEnd,
		},
	}),
	marketing(umi, {
		...common,
		unlockedBucket: {
			bucketIndex: bucket.marketingUnlockedBucketIndex,
			recipient: wallets.marketing,
		},
		streamflowBucket: {
			bucketIndex: bucket.marketingStreamflowBucketIndex,
			recipient: wallets.marketing,
		},
		timeline: {
			claimStart: timeline.claimStart,
			claimEnd: timeline.claimEnd,
			vestingStart: timeline.marketingVestingStart,
			vestingEnd: timeline.marketingVestingEnd,
		},
	}),
	liquidity(umi, {
		...common,
		unlockedBucket: {
			bucketIndex: bucket.liquidityManagementUnlockedBucketIndex,
			recipient: wallets.liquidity,
		},
		timeline: {
			claimStart: timeline.claimStart,
			claimEnd: timeline.claimEnd,
		},
	}),
	treasury(umi, {
		...common,
		unlockedBucket: {
			bucketIndex: bucket.treasuryUnlockedBucketIndex,
			recipient: wallets.treasury,
		},
		streamflowBucket: {
			bucketIndex: bucket.treasuryStreamflowBucketIndex,
			recipient: wallets.treasury,
		},
		timeline: {
			claimStart: timeline.claimStart,
			claimEnd: timeline.claimEnd,
			vestingStart: timeline.treasuryVestingStart,
			vestingEnd: timeline.treasuryVestingEnd,
		},
	}),
	finalize(umi, common),
].flat();

logger.info(`Total steps to execute: ${steps.length}`);

for (const [index, step] of steps.entries()) {
	const numWithSpacePadding = `${index + 1}`.padStart(`${steps.length}`.length, ' ');
	logger.info(`[${numWithSpacePadding}/${steps.length}] ${step.description}`);
}

if (send) {
	for (const [index, step] of steps.entries()) {
		const numWithSpacePadding = `${index + 1}`.padStart(`${steps.length}`.length, ' ');
		logger.info(`⏳ [${numWithSpacePadding}/${steps.length}] ${step.description}...`);
		const result = await step.builder.sendAndConfirm(umi);
		const signature58 = base58.deserialize(result.signature);
		logger.info(`✅ [${numWithSpacePadding}/${steps.length}] ${step.description} sent: ${signature58}`);
	}
	logger.info('Launch completed successfully.');
}
