import globalLogger from '@/lib/logging/globalLogger';
import type { Pipeline, StepResult } from '@/lib/pipeline/types';

type BuildPipelineOptions = {
	name: string;
	steps: StepResult[];
};

export default function buildPipeline(options: BuildPipelineOptions): Pipeline {
	return {
		logger: globalLogger.getSubLogger({ name: options.name }),
		steps: options.steps.flat(),
	};
}
