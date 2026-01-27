export default class PipelineError extends Error {
	constructor(
		message: string,
		public readonly stepIndex: number,
		options?: ErrorOptions,
	) {
		super(`Pipeline failed at step index: ${stepIndex}, error: ${message}`, options);
		this.name = 'PipelineError';
	}
}
