import { createAudioResource } from "@discordjs/voice";
import { randomUUID } from "crypto";
import { User } from "discord.js";

import { Beatmapset } from "../../types/beatmap";
import { bufferToStream } from "../../utils/transformers/bufferToStream";

export class Song {
	public beatmapInfo: Beatmapset;
	private audioFile: Buffer;
	public user: User;
	public duration: number;
	public id = randomUUID();

	constructor(
		beatmapInfo: Beatmapset,
		user: User,
		audioFile: Buffer,
		duration: number
	) {
		this.beatmapInfo = beatmapInfo;
		this.audioFile = audioFile;
		this.user = user;

		this.duration = duration;
	}

	public getAudio() {
		return createAudioResource(bufferToStream(this.audioFile));
	}
}
