import { describe, expect, test } from 'bun:test';
import BucketCounter from './BucketCounter';

describe('BucketCounter', () => {
	test('returns 0 on first get for a bucket', () => {
		const counter = new BucketCounter(['alpha', 'beta'] as const);

		expect(counter.get('alpha')).toBe(0);
		expect(counter.get('beta')).toBe(0);
	});

	test('increments counter on subsequent gets', () => {
		const counter = new BucketCounter(['alpha'] as const);

		expect(counter.get('alpha')).toBe(0);
		expect(counter.get('alpha')).toBe(1);
		expect(counter.get('alpha')).toBe(2);
	});

	test('tracks multiple buckets independently', () => {
		const counter = new BucketCounter(['alpha', 'beta', 'gamma'] as const);

		expect(counter.get('alpha')).toBe(0);
		expect(counter.get('beta')).toBe(0);
		expect(counter.get('alpha')).toBe(1);
		expect(counter.get('gamma')).toBe(0);
		expect(counter.get('beta')).toBe(1);
		expect(counter.get('alpha')).toBe(2);
	});

	test('resolves aliases to canonical bucket names', () => {
		const aliases = new Map<'a' | 'alpha', 'alpha'>([['a', 'alpha']]);
		const counter = new BucketCounter(['alpha'] as const, aliases);

		expect(counter.get('alpha')).toBe(0);
		expect(counter.get('a')).toBe(1); // alias increments same counter
		expect(counter.get('alpha')).toBe(2);
	});

	test('handles multiple aliases to the same bucket', () => {
		type BucketName = 'primary' | 'p' | 'main';
		const aliases = new Map<BucketName, 'primary'>([
			['p', 'primary'],
			['main', 'primary'],
		]);
		const counter = new BucketCounter<BucketName>(['primary'], aliases);

		expect(counter.get('primary')).toBe(0);
		expect(counter.get('p')).toBe(1);
		expect(counter.get('main')).toBe(2);
		expect(counter.get('primary')).toBe(3);
	});

	test('treats non-aliased names as-is', () => {
		const aliases = new Map<'a' | 'alpha' | 'beta', 'alpha'>([['a', 'alpha']]);
		const counter = new BucketCounter(['alpha', 'beta'] as const, aliases);

		expect(counter.get('beta')).toBe(0); // not aliased
		expect(counter.get('alpha')).toBe(0);
		expect(counter.get('a')).toBe(1); // aliased to alpha
		expect(counter.get('beta')).toBe(1);
	});

	test('exposes choices as readonly property', () => {
		const choices = ['x', 'y', 'z'] as const;
		const counter = new BucketCounter(choices);

		expect(counter.choices).toBe(choices);
	});
});
