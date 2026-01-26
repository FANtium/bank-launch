import { addHours } from 'date-fns/addHours';
import { addMonths } from 'date-fns/addMonths';
import { addSeconds } from 'date-fns/addSeconds';
import {
	CLAIM_DURATION_HOURS,
	MARKETING_VESTING_MONTHS,
	SALE_DURATION_HOURS,
	TREASURY_VESTING_MONTHS,
} from '@/constants/timeline';

export default function getTimeline(publicSaleStart: Date) {
	const publicSaleEnd = addHours(publicSaleStart, SALE_DURATION_HOURS);
	const claimStart = addSeconds(publicSaleEnd, 1); // claimStart > publicSaleEnd
	const claimEnd = addHours(claimStart, CLAIM_DURATION_HOURS);

	const treasuryVestingStart = claimStart;
	const treasuryVestingEnd = addMonths(treasuryVestingStart, TREASURY_VESTING_MONTHS);

	const marketingVestingStart = claimStart;
	const marketingVestingEnd = addMonths(marketingVestingStart, MARKETING_VESTING_MONTHS);

	return {
		publicSaleStart,
		publicSaleEnd,
		claimStart,
		claimEnd,
		treasuryVestingStart,
		treasuryVestingEnd,
		marketingVestingStart,
		marketingVestingEnd,
	};
}
