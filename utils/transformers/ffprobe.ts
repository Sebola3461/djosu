import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import { FFProbeOutput } from "../../types/ffmpeg";

export function ffprobe(path: string): Promise<FfprobeData> {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(path, (err, data) => {
			if (err) return reject(err);

			resolve(data);
		});
	});
}
