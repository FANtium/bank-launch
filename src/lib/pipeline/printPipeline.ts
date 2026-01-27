import globalLogger from '@/lib/logging/globalLogger';
import type { Pipeline } from '@/lib/pipeline/types';
import getPaddedNum from '@/utils/getPaddedNum';

export default function printPipeline(pipeline: Pipeline) {
	const logger = pipeline.logger ?? globalLogger.getSubLogger({ name: 'printPipeline' });
	const { steps, startStep = 0 } = pipeline;
	const totalSteps = steps.length;

	if (startStep > 0) {
		logger.info(`Skipping steps 0-${startStep - 1}, starting from step ${startStep}`);
	}
	logger.info(`Steps to execute: ${totalSteps - startStep} (of ${totalSteps} total)`);

	for (const [index, step] of steps.entries()) {
		const paddedNum = getPaddedNum(index, totalSteps);
		const skipped = index < startStep ? ' (skipped)' : '';
		const label = `[${paddedNum}/${totalSteps}] ${step.description}${skipped}`;
		logger.info(label);
	}
}
