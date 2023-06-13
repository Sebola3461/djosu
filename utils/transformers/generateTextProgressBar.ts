export function generateTextProgressBar(current: number, total: number) {
	const fillCharacter = "█";
	const unfilledCharacter = "•";

	let result = "";

	if (isNaN(total)) total = 15;
	if (isNaN(current)) current = 0;

	if (current > total) current = total;

	result = result
		.concat(fillCharacter.repeat(current))
		.concat(unfilledCharacter.repeat(total - current))
		.trimEnd();

	return `\`[ ${result} ]\``;
}
