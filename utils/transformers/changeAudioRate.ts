import ffmpeg from "fluent-ffmpeg";
import internal from "stream";
import { randomBytes } from "crypto";
import { resolve } from "path";
import { readFileSync, unlinkSync } from "fs";

export function changeAudioRate(
	audio: Buffer,
	format: string,
	rate: number,
	modifyPitch: boolean
): Promise<Buffer> {
	return new Promise((resolvePromise, reject) => {
		try {
			const hash = randomBytes(20).toString("hex");
			const path = resolve(
				"./cache/rateChange/".concat(`${hash}.${format}`)
			);

			const filters = {
				filter: "atempo",
				options: rate,
			};

			ffmpeg({
				source: internal.Readable.from(audio, {
					objectMode: false,
				}),
			})
				.format(format)
				.audioFilters([filters])
				.saveToFile(path)
				.on("error", (e) => {
					console.log("error rate change");

					console.error(e);
					reject(e);
				})
				.on("end", (e) => {
					const audioBuffer = readFileSync(path);

					unlinkSync(path);

					resolvePromise(audioBuffer);
				});
		} catch (e) {
			reject(e);
		}
	});
}
