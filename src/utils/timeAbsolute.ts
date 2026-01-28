import { condition, NOT_TRIGGERED_TIMESTAMP } from '@metaplex-foundation/genesis';
import { getUnixTime } from 'date-fns/getUnixTime';
import padding from '@/utils/padding';

export default function timeAbsolute(date: Date | number | bigint) {
	return condition('TimeAbsolute', {
		padding: padding(47),
		time: date instanceof Date ? getUnixTime(date) : date,
		triggeredTimestamp: NOT_TRIGGERED_TIMESTAMP,
	});
}
