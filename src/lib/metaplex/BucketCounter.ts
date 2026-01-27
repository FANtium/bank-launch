/**
 * A counter that tracks occurrences for named buckets, supporting aliases.
 *
 * Each call to {@link get} increments and returns the count for the given bucket.
 * Aliases allow multiple names to resolve to the same canonical bucket.
 *
 * @typeParam T - The string literal union type of valid bucket names
 *
 * @example
 * ```ts
 * const counter = new BucketCounter(
 *   ["alpha", "beta"] as const,
 *   new Map([["a", "alpha"]]) // "a" is an alias for "alpha"
 * );
 *
 * counter.get("alpha"); // 0
 * counter.get("a");     // 1 (alias resolves to "alpha")
 * counter.get("beta");  // 0
 * counter.get("alpha"); // 2
 * ```
 */
export default class BucketCounter<T extends string> {
	private readonly counters = new Map<T, number>();

	/**
	 * Creates a new BucketCounter.
	 *
	 * @param choices - The valid bucket names for this counter
	 * @param aliases - Optional map of alias names to their canonical bucket names
	 */
	constructor(
		public readonly choices: readonly T[],
		private readonly aliases = new Map<T, T>(),
	) {}

	addAlias(alias: T, canonicalName: T) {
		if (!this.choices.includes(canonicalName)) {
			throw new Error(`Cannot add alias for unknown bucket name: ${canonicalName}`);
		}

		this.aliases.set(alias, canonicalName);
	}

	/**
	 * Returns the current counter value for the given bucket, then increments it.
	 *
	 * If the name is an alias, it resolves to the canonical bucket name before incrementing.
	 *
	 * @param nameOrAlias - The bucket name or an alias to increment
	 * @returns The counter value for the bucket (0-indexed)
	 */
	get(nameOrAlias: T): number {
		const name = this.aliases.get(nameOrAlias) ?? nameOrAlias;

		const current = this.counters.get(name) ?? 0;
		this.counters.set(name, current + 1);
		return current;
	}
}
