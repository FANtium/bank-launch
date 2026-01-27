import type { TransactionBuilder } from '@metaplex-foundation/umi';
import type { ILogObj, Logger } from 'tslog';

export type Step = {
	description: string;
	builder: TransactionBuilder;
};

export type StepResult = Step | Step[];

export type Pipeline = {
	steps: Step[];
	startStep?: number;
	logger?: Logger<ILogObj>;
};
