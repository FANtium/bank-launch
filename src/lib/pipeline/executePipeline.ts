import type { Context } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import globalLogger from '@/lib/logging/globalLogger';
import PipelineError from '@/lib/pipeline/PipelineError';
import type { Pipeline, Step } from '@/lib/pipeline/types';
import getPaddedNum from '@/utils/getPaddedNum';

export default async function executePipeline(
	context: Pick<Context, 'transactions' | 'rpc' | 'payer'>,
	pipeline: Pipeline,
) {
	const logger = pipeline.logger || globalLogger.getSubLogger({ name: 'executePipeline' });
	const { steps, startStep = 0 } = pipeline;
	const totalSteps = steps.length;
	const completedSteps: Step[] = [];

	for (const [index, step] of steps.entries()) {
		const paddedNum = getPaddedNum(index, totalSteps);
		const label = `[${paddedNum}/${totalSteps}] ${step.description}`;

		if (index < startStep) {
			logger.info(`Skipping step ${label}`);
			continue;
		}

		try {
			logger.info(`⏳ ${label}...`);
			const result = await step.builder.sendAndConfirm(context);
			const [signature58] = base58.deserialize(result.signature);
			logger.info(`✅ ${label} sent: ${signature58}`);
			completedSteps.push(step);
		} catch (error) {
			logger.error(`❌ ${label} failed`);

			const message = error instanceof Error ? error.message : String(error);
			const pipelineError = new PipelineError(message, index, { cause: error });
			throw pipelineError;
		}
	}

	return completedSteps;
}
