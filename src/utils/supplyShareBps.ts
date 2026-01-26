import { BANK_TOTAL_SUPPLY } from '@/constants/token';

export default function supplyShareBps(amount: number) {
	return (BANK_TOTAL_SUPPLY * BigInt(amount)) / 10000n;
}
