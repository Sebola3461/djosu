import { createAudioResource } from "@discordjs/voice";
import { randomUUID } from "crypto";
import { User } from "discord.js";

import { Beatmapset } from "../../types/beatmap";
import { bufferToStream } from "../../utils/transformers/bufferToStream";
import { changeAudioRate } from "../../utils/transformers/changeAudioRate";
import { streamToBuffer } from "../../utils/transformers/streamToBuffer";

export class Song {
	public beatmapInfo: Beatmapset;
	private audioFile: Buffer;
	public user: User;
	public duration: number;
	public id = randomUUID();
	public playbackRate = 1;
	public readonly audioFormat: string;

	constructor(
		beatmapInfo: Beatmapset,
		user: User,
		audioFile: Buffer,
		audioFormat: string,
		duration: number
	) {
		this.beatmapInfo = beatmapInfo;
		this.audioFile = audioFile;
		this.user = user;
		this.audioFormat = audioFormat;

		this.duration = duration;
	}

	public async setRate(rate: number, modifyPitch: boolean) {
		try {
			this.playbackRate = rate;

			const newAudio = await changeAudioRate(
				this.audioFile,
				this.audioFormat,
				rate,
				modifyPitch
			);

			this.audioFile = newAudio;

			return this;
		} catch (e) {
			this.playbackRate = 1;

			return this;
		}
	}

	public getAudio() {
		return createAudioResource(bufferToStream(this.audioFile));
	}
}
