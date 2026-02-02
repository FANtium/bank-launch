import type { Duration } from 'date-fns';

const unitMap: Record<string, keyof Duration> = {
	year: 'years',
	years: 'years',
	month: 'months',
	months: 'months',
	week: 'weeks',
	weeks: 'weeks',
	day: 'days',
	days: 'days',
	hour: 'hours',
	hours: 'hours',
	hr: 'hours',
	hrs: 'hours',
	minute: 'minutes',
	minutes: 'minutes',
	min: 'minutes',
	mins: 'minutes',
	second: 'seconds',
	seconds: 'seconds',
	sec: 'seconds',
	secs: 'seconds',
};

const segmentPattern = /^(\d+)\s+(\w+)$/;

function parseSegment(segment: string): [keyof Duration, number] {
	const match = segment.trim().match(segmentPattern);
	if (!match) {
		throw new Error(`Invalid duration segment: "${segment.trim()}"`);
	}

	const value = Number(match[1]);
	const rawUnit = match[2] as string;
	const unit = unitMap[rawUnit];
	if (!unit) {
		throw new Error(`Unknown duration unit: "${rawUnit}"`);
	}

	return [unit, value];
}

export default function parseDuration(input: string): Duration {
	const segments = input.split(',');
	const duration: Duration = {};

	for (const segment of segments) {
		const [unit, value] = parseSegment(segment);
		duration[unit] = (duration[unit] ?? 0) + value;
	}

	return duration;
}
