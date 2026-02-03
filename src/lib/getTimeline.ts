import { add } from 'date-fns/add';
import { addSeconds } from 'date-fns/addSeconds';
import {
	CLAIM_DURATION,
	MARKETING_VESTING_DURATION,
	SALE_DURATION,
	TREASURY_VESTING_DURATION,
} from '@/constants/timeline';
import parseDuration from '@/lib/parseDuration';

export default function getTimeline(publicSaleStart: Date) {
	const publicSaleEnd = add(publicSaleStart, parseDuration(SALE_DURATION));
	const claimStart = addSeconds(publicSaleEnd, 1); // claimStart > publicSaleEnd
	const claimEnd = add(claimStart, parseDuration(CLAIM_DURATION));

	const treasuryVestingStart = publicSaleStart;
	const treasuryVestingEnd = add(treasuryVestingStart, parseDuration(TREASURY_VESTING_DURATION));

	const marketingVestingStart = publicSaleStart;
	const marketingVestingEnd = add(marketingVestingStart, parseDuration(MARKETING_VESTING_DURATION));

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
