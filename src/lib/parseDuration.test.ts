import { describe, expect, test } from 'bun:test';
import parseDuration from '@/lib/parseDuration';

describe('parseDuration', () => {
	test('parses singular units', () => {
		expect(parseDuration('1 year')).toEqual({ years: 1 });
		expect(parseDuration('1 month')).toEqual({ months: 1 });
		expect(parseDuration('1 week')).toEqual({ weeks: 1 });
		expect(parseDuration('1 day')).toEqual({ days: 1 });
		expect(parseDuration('1 hour')).toEqual({ hours: 1 });
		expect(parseDuration('1 minute')).toEqual({ minutes: 1 });
		expect(parseDuration('1 second')).toEqual({ seconds: 1 });
	});

	test('parses plural units', () => {
		expect(parseDuration('2 years')).toEqual({ years: 2 });
		expect(parseDuration('24 months')).toEqual({ months: 24 });
		expect(parseDuration('3 weeks')).toEqual({ weeks: 3 });
		expect(parseDuration('7 days')).toEqual({ days: 7 });
		expect(parseDuration('48 hours')).toEqual({ hours: 48 });
		expect(parseDuration('30 minutes')).toEqual({ minutes: 30 });
		expect(parseDuration('90 seconds')).toEqual({ seconds: 90 });
	});

	test('parses short aliases', () => {
		expect(parseDuration('2 hr')).toEqual({ hours: 2 });
		expect(parseDuration('2 hrs')).toEqual({ hours: 2 });
		expect(parseDuration('15 min')).toEqual({ minutes: 15 });
		expect(parseDuration('15 mins')).toEqual({ minutes: 15 });
		expect(parseDuration('30 sec')).toEqual({ seconds: 30 });
		expect(parseDuration('30 secs')).toEqual({ seconds: 30 });
	});

	test('parses multiple comma-separated units', () => {
		expect(parseDuration('23 hours, 15 mins')).toEqual({
			hours: 23,
			minutes: 15,
		});
		expect(parseDuration('1 year, 6 months')).toEqual({
			years: 1,
			months: 6,
		});
		expect(parseDuration('2 days, 12 hours, 30 minutes')).toEqual({
			days: 2,
			hours: 12,
			minutes: 30,
		});
	});

	test('merges duplicate units', () => {
		expect(parseDuration('10 mins, 5 mins')).toEqual({ minutes: 15 });
		expect(parseDuration('1 hr, 2 hrs')).toEqual({ hours: 3 });
	});

	test('throws on invalid format', () => {
		expect(() => parseDuration('')).toThrow('Invalid duration segment');
		expect(() => parseDuration('hours')).toThrow('Invalid duration segment');
		expect(() => parseDuration('abc hours')).toThrow('Invalid duration segment');
	});

	test('throws on unknown unit', () => {
		expect(() => parseDuration('5 fortnights')).toThrow('Unknown duration unit: "fortnights"');
	});
});
