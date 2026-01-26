export default function getPaddedNum(index: number, length: number): string {
	const num = index + 1;
	const digitsLength = length.toString().length;
	return num.toString().padStart(digitsLength, ' ');
}
