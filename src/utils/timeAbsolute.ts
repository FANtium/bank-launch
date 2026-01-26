import { condition, NOT_TRIGGERED_TIMESTAMP } from '@metaplex-foundation/genesis';
import { getUnixTime } from 'date-fns/getUnixTime';

export default function timeAbsolute(date: Date | number | bigint) {
	return condition('TimeAbsolute', {
		padding: Array(47).fill(0),
		time: date instanceof Date ? getUnixTime(date) : date,
		triggeredTimestamp: NOT_TRIGGERED_TIMESTAMP,
	});
}
