import { createAudioResource } from "@discordjs/voice";
import { Beatmapset } from "../../types/beatmap";
import { bufferToStream } from "../../utils/transformers/bufferToStream";
import { User } from "discord.js";
import { randomUUID } from "crypto";

export class Song {
	public beatmapInfo: Beatmapset;
	private audioFile: Buffer;
	public user: User;
	public id = randomUUID();

	constructor(beatmapInfo: Beatmapset, user: User, audioFile: Buffer) {
		this.beatmapInfo = beatmapInfo;
		this.audioFile = audioFile;
		this.user = user;
	}

	public getAudio() {
		return createAudioResource(bufferToStream(this.audioFile));
	}
}
