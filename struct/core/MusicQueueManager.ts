import { GuildTextBasedChannel, VoiceBasedChannel } from "discord.js";
import { DjOsu } from "./DjOsu";
import { MusicQueue } from "./MusicQueue";
import { Song } from "./Song";

export class MusicQueueManager {
	private queues: (MusicQueue | undefined)[] = [];
	public djosu: DjOsu;

	constructor(djosu: DjOsu) {
		this.djosu = djosu;
	}

	addSongToQueue(song: Song, channel: VoiceBasedChannel) {
		let queue = this.getQueue(channel.guildId);

		if (!queue) queue = this.createQueue(channel);

		const queueIndex = this.getQueueIndex(channel.guildId);
		queue.addSong(song);

		return this.queues[queueIndex];
	}

	public get queuesLength() {
		return this.queues.filter((q) => q !== null).length;
	}

	public getAll() {
		return this.queues;
	}

	setQueueTextChannel(channel: GuildTextBasedChannel) {
		let queue = this.getQueue(channel.guildId);

		if (!queue) return;

		const queueIndex = this.getQueueIndex(channel.guildId);
		queue.setTextChannel(channel);

		return this.queues[queueIndex];
	}

	getQueueIndex(guildId: string) {
		return this.queues.findIndex((q) => q != null && q.guildId == guildId);
	}

	getQueue(guildId: string) {
		return this.queues.find((q) => q != null && q.guildId == guildId);
	}

	destroy(guildId: string) {
		const index = this.queues.findIndex(
			(q) => q != null && q.guildId == guildId
		);

		delete this.queues[index];

		return true;
	}

	createQueue(channel: VoiceBasedChannel) {
		const newQueue = new MusicQueue({
			bot: this.djosu,
			channel: channel,
		});

		this.queues.push(newQueue);

		return newQueue;
	}
}
