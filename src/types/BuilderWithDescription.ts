import type { TransactionBuilder } from '@metaplex-foundation/umi';

export type BuilderWithDescription = {
	description: string;
	builder: TransactionBuilder;
};

export type StepResult = BuilderWithDescription | BuilderWithDescription[];
