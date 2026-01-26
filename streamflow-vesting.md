# StreamflowBucketV2 Finalize Issue Report

## Summary

The `finalizeV2` instruction in the Genesis program (deployed on devnet) fails to validate `StreamflowBucketV2` bucket accounts, returning error code `0x1b` ("Invalid Bucket passed in"). All other V2 bucket types (`UnlockedBucketV2`, `LaunchPoolBucketV2`, `RaydiumCpmmBucketV2`) work correctly.

## Environment

- **Genesis SDK**: `@metaplex-foundation/genesis@0.16.0`
- **Genesis Program ID**: `GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B`
- **Network**: Devnet (cloned to local via Surfpool)
- **UMI**: `@metaplex-foundation/umi@1.4.1`

## Reproduction Steps

### 1. Initialize Genesis Account V2

```typescript
import { initializeV2 } from '@metaplex-foundation/genesis';

const builder = initializeV2(context, {
	baseMint,
	genesisIndex: 0,
	// ... other params
});
```

### 2. Create StreamflowBucketV2

```typescript
import { addStreamflowBucketV2, findStreamflowBucketV2Pda } from '@metaplex-foundation/genesis';

const [streamflowBucket] = findStreamflowBucketV2Pda(context, {
	genesisAccount,
	bucketIndex: 0,
});

const builder = addStreamflowBucketV2(context, {
	genesisAccount,
	baseMint,
	bucketIndex: 0,
	baseTokenAllocation: 150000000000000000n, // 15% of 1B tokens
	recipient: recipientWallet,
	config: {
		streamName: Buffer.from('Marketing Vesting'),
		cliffAmount: 37500000000000000n,
		startTime: getUnixTime(vestingStart),
		endTime: getUnixTime(vestingEnd),
		period: 86400, // 1 day
		amountPerPeriod: calculateAmountPerPeriod(),
		// ... other config
	},
	lockStartCondition: timeAbsolute(vestingStart),
	lockEndCondition: timeAbsolute(vestingEnd),
	backendSigner: { signer: authority },
});
```

**Result**: Bucket created successfully with discriminator `28` (StreamflowBucketV2).

### 3. Attempt to Finalize

```typescript
import { finalizeV2 } from '@metaplex-foundation/genesis';

const builder = finalizeV2(context, {
	genesisAccount,
	baseMint,
}).addRemainingAccounts([{ pubkey: streamflowBucket, isSigner: false, isWritable: true }]);
```

**Result**: Transaction fails with:

```
Program log: FinalizeV2
Program log: Invalid Bucket passed in
Program GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B failed: custom program error: 0x1b
```

## Verification of Bucket Validity

### On-Chain Bucket Data

After creating the StreamflowBucketV2, we verified the on-chain data:

```
Genesis account: 2ZRzGVftJpjazzqmJiNnbN6127smj26PJQcESjYDssQY
Genesis bucketCount: 1
Genesis finalized: false

Streamflow Bucket PDA: 6nRcwR7TAympTHtCLivbJPmzgJHcXr4cukxhK1ix2VGd
Key discriminator: 28 (expected: 28 for StreamflowBucketV2)
bucket.bucketIndex: 0
bucket.genesis: 2ZRzGVftJpjazzqmJiNnbN6127smj26PJQcESjYDssQY
bucket.bump: 255
Genesis match: YES
```

All bucket data is correct:

- Correct discriminator (28 = StreamflowBucketV2)
- Correct genesis account reference
- Correct bucket index
- Valid PDA derived from `['streamflow_v2', genesisAccount, bucketIndex]`

## Testing Matrix

| Bucket Configuration                                                  | Result                        |
| --------------------------------------------------------------------- | ----------------------------- |
| 1 UnlockedBucketV2                                                    | ✅ Finalize succeeds          |
| 3 UnlockedBucketV2                                                    | ✅ Finalize succeeds          |
| 2 UnlockedBucketV2 + 1 LaunchPoolBucketV2 + 1 RaydiumCpmmBucketV2     | ✅ Finalize succeeds          |
| 1 StreamflowBucketV2 (alone)                                          | ❌ "Invalid Bucket passed in" |
| 3 UnlockedBucketV2 + 1 StreamflowBucketV2                             | ❌ "Invalid Bucket passed in" |
| Full 8 buckets (4 unlocked + 1 launchpool + 1 raydium + 2 streamflow) | ❌ "Invalid Bucket passed in" |

## PDA Derivation

The SDK derives StreamflowBucketV2 PDAs using:

```javascript
// From @metaplex-foundation/genesis/dist/src/generated/accounts/streamflowBucketV2.js
function findStreamflowBucketV2Pda(context, seeds) {
	const programId = context.programs.getPublicKey('genesis', 'GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B');
	return context.eddsa.findPda(programId, [
		string({ size: 'variable' }).serialize('streamflow_v2'),
		publicKey().serialize(seeds.genesisAccount),
		u8().serialize(seeds.bucketIndex),
	]);
}
```

This is consistent with `addStreamflowBucketV2` which uses the same PDA derivation.

## Hypothesis

The `finalizeV2` instruction validates remaining accounts (buckets) by checking their discriminators and possibly re-deriving PDAs. The program may:

1. Not recognize discriminator `28` (StreamflowBucketV2) as a valid bucket type
2. Use different seeds for PDA validation than what `addStreamflowBucketV2` uses
3. Have a bug in the V2 bucket validation logic that doesn't handle streamflow buckets

## Bucket Discriminators

From the SDK:

- `21` = UnlockedBucketV2
- `22` = RaydiumCpmmBucketV2
- `26` = LaunchPoolBucketV2
- `28` = StreamflowBucketV2

## Workaround

Currently, the only workaround is to exclude StreamflowBucketV2 from the finalize step and handle vesting allocations through a different mechanism.

## Expected Behavior

The `finalizeV2` instruction should accept all V2 bucket types as remaining accounts, including `StreamflowBucketV2`, as long as:

1. The bucket exists on chain
2. The bucket's `genesis` field matches the genesis account being finalized
3. The bucket's discriminator indicates a valid V2 bucket type
4. The number of buckets matches `genesis.bucketCount`

## Additional Context

This issue was discovered while implementing a token launch with the following allocation:

- 10% Private Sale (UnlockedBucketV2)
- 5% Public Sale (UnlockedBucketV2 + LaunchPoolBucketV2)
- 2% Raydium CPMM (RaydiumCpmmBucketV2)
- 25% Bankroll (UnlockedBucketV2)
- 15% Marketing (StreamflowBucketV2) ← Causes failure
- 23% Liquidity (UnlockedBucketV2)
- 20% Treasury (StreamflowBucketV2) ← Causes failure

All bucket creation transactions succeed. Only the final `finalizeV2` call fails.

## Request

Please investigate whether:

1. This is a known limitation of the deployed program
2. There's a program update pending that fixes this
3. There's a different approach we should use for streamflow vesting with Genesis V2

Thank you for your assistance.
