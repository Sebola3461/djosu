import {
	AudioPlayer,
	AudioPlayerStatus,
	createAudioPlayer,
	joinVoiceChannel,
	NoSubscriberBehavior,
	VoiceConnection,
} from "@discordjs/voice";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ColorResolvable,
	EmbedBuilder,
	GuildMember,
	GuildTextBasedChannel,
	TextBasedChannel,
	VoiceBasedChannel,
} from "discord.js";
import { rmSync } from "fs";
import path from "path";

import { djosu } from "../..";
import { colors } from "../../constants/colors";
import timeString from "../../utils/transformers/timeString";
import { DjOsu } from "./DjOsu";
import { Song } from "./Song";

export enum SongRemoveStatus {
	Destroyed,
	Skip,
	Previous,
	None,
}

export class MusicQueue {
	public bot!: DjOsu;
	public readonly voiceChannel: VoiceBasedChannel;
	public readonly guildId: string;
	public readonly channelId: string;
	public readonly connection: VoiceConnection;
	public readonly player: AudioPlayer;
	public textChannel!: TextBasedChannel;

	// Controls
	public loop = false;

	// resources
	private currentSongIndex = 0;

	// message
	private lastStatusMessageId: string = "";

	private songs: Song[] = [];

	private afkDestroyTimeout: NodeJS.Timeout | null = null;

	constructor(options: { bot: DjOsu; channel: VoiceBasedChannel }) {
		this.player = createAudioPlayer({
			behaviors: { noSubscriber: NoSubscriberBehavior.Play },
		});

		this.guildId = options.channel.guildId;
		this.channelId = options.channel.id;

		this.voiceChannel = options.channel;

		this.connection = joinVoiceChannel({
			channelId: this.channelId,
			guildId: this.guildId,
			adapterCreator: options.channel.guild.voiceAdapterCreator,
		});

		this.connection.subscribe(this.player);

		this.skipSong.bind(this);
		this.sendUpdateMessage.bind(this);
		this.play.bind(this);
		this.isLoop.bind(this);

		this.player.on("stateChange", (state, oldState) => {
			if (
				state.status == AudioPlayerStatus.Playing &&
				oldState.status == AudioPlayerStatus.Idle
			) {
				if (this.isLoop()) {
					this.play();
				} else {
					this.skipSong();
				}
			}

			if (
				state.status == AudioPlayerStatus.Idle &&
				oldState.status == AudioPlayerStatus.Playing
			) {
				if (this.isLoop()) {
					this.play();
				} else {
					this.skipSong();
				}
			}
		});
	}

	public checkManagePermissionsFor(member: GuildMember) {
		const currentSong = this.getCurrentSong();

		if (!currentSong) return;

		if (!this.voiceChannel.members.has(this.getCurrentSong().user.id))
			return true;

		if (this.voiceChannel.members.size == 2) return true;

		if (this.getCurrentSong().user.id == member.id) return true;

		if (
			this.getCurrentSong().user.id != member.id &&
			!member.permissions.has("DeafenMembers", true) &&
			!member.permissions.has("MuteMembers", true) &&
			!member.permissions.has("ManageChannels", true)
		)
			return false;

		return true;
	}

	public checkAdminPermissionsFor(member: GuildMember) {
		const currentSong = this.getCurrentSong();

		if (!currentSong) return;

		if (this.voiceChannel.members.size == 2) return true;

		if (
			!member.permissions.has("DeafenMembers", true) &&
			!member.permissions.has("MuteMembers", true) &&
			!member.permissions.has("ManageChannels", true)
		)
			return false;

		return true;
	}

	private getSongIndex() {
		return this.currentSongIndex;
	}

	private setSongIndex(index: number) {
		return (this.currentSongIndex = index);
	}

	private isLoop() {
		return this.loop;
	}

	public getPlayingEmbedButtons() {
		const previousSong = new ButtonBuilder()
			.setLabel("◀️")
			.setCustomId(`global,previousSong`)
			.setStyle(ButtonStyle.Secondary);
		const pauseSong = new ButtonBuilder()
			.setLabel("⏯️")
			.setCustomId(`global,pauseSong`)
			.setStyle(
				this.player.state.status == AudioPlayerStatus.Paused
					? ButtonStyle.Success
					: ButtonStyle.Secondary
			);
		const loopToggle = new ButtonBuilder()
			.setLabel("🔁")
			.setCustomId(`global,loopSong`)
			.setStyle(
				this.isLoop() ? ButtonStyle.Success : ButtonStyle.Secondary
			);
		const nextSong = new ButtonBuilder()
			.setLabel("▶️")
			.setCustomId(`global,nextSong`)
			.setStyle(ButtonStyle.Secondary);

		return new ActionRowBuilder<ButtonBuilder>().setComponents(
			previousSong,
			pauseSong,
			loopToggle,
			nextSong
		);
	}

	hasNext() {
		return this.getSongIndex() + 1 <= this.getSongs().length;
	}

	hasPrevious() {
		return this.getSongIndex() >= 0;
	}

	addSong(song: Song) {
		this.setSongs(this.getSongs().concat(song));

		if (this.player.state.status == AudioPlayerStatus.Idle) {
			this.play();
			this.sendUpdateMessage();
		}

		return song;
	}

	clearDestroyTimeout() {
		if (this.afkDestroyTimeout) clearTimeout(this.afkDestroyTimeout);
	}

	setTextChannel(textChannel: GuildTextBasedChannel) {
		this.textChannel = textChannel;

		return this;
	}

	selectSong(index: number) {
		this.setSongIndex(index);
		this.player.play(this.getSongs()[this.getSongIndex()].getAudio());
	}

	getCurrentSong() {
		return this.getSongs()[this.getSongIndex()];
	}

	findCurrentSongIndex() {
		return this.getSongs().findIndex(
			(c) => c.id == this.getCurrentSong().id
		);
	}

	findSongIndexById(songId: string) {
		return this.getSongs().findIndex((c) => c.id == songId);
	}

	public sendUpdateMessage() {
		this.textChannel.messages.delete(this.lastStatusMessageId).catch(() => {
			void {};
		});

		this.setLastMessageId.bind(this);

		this.textChannel
			.send(this.generateQueueMessage())
			.then((message) => this.setLastMessageId(message.id));
	}

	private sendFinalizationMessage() {
		this.textChannel.messages.delete(this.lastStatusMessageId).catch(() => {
			void {};

			console.log("sent last message delete");
		});

		this.setLastMessageId.bind(this);

		console.log("sent last message");

		this.textChannel
			.send(this.generateClearQueueMessage())
			.then((message) => this.setLastMessageId(message.id));
	}

	private setLastMessageId(id: string) {
		this.lastStatusMessageId = id;

		return this;
	}

	private getSongDuration() {
		const songBeatmaps = this.getCurrentSong().beatmapInfo.beatmaps;

		if (!songBeatmaps) return timeString(0);

		return timeString(songBeatmaps[0].total_length);
	}

	private generateClearQueueMessage() {
		const embed = new EmbedBuilder()
			.setAuthor({
				name: "🎵 Queue is now empty! I will delete it to save resources.",
			})
			.setColor(colors.blue as ColorResolvable);

		return {
			embeds: [embed],
		};
	}

	public clearQueue() {
		this.player.stop();
		this.setSongs([] as Song[]);
		this.setSongIndex(0);
		this.lastStatusMessageId = "";

		return this;
	}

	public pause() {
		if (this.player.state.status == AudioPlayerStatus.Paused)
			return this.player.unpause();
		this.player.pause();
	}

	private generateQueueMessage() {
		const currentSong = this.getCurrentSong();

		const embed = new EmbedBuilder()
			.setAuthor({
				name: "🎵 Now playing",
			})
			.setTitle(
				`${currentSong.beatmapInfo.artist} - ${currentSong.beatmapInfo.title}`
			)
			.setURL(
				`https://osu.ppy.sh/beatmapsets/${currentSong.beatmapInfo.id}`
			)
			.setThumbnail(
				`https://b.ppy.sh/thumb/${currentSong.beatmapInfo.id}l.jpg`
			)
			.setDescription(
				`🕒 Duration: ${this.getSongDuration()} | 👤 Requested by: <@${
					currentSong.user.id
				}>`
			)
			.setColor(colors.pink as ColorResolvable);

		return {
			embeds: [embed],
			components: [this.getPlayingEmbedButtons()],
		};
	}

	private deleteBeatmap() {
		const stagingPath = path.resolve("./cache/staging");
		const cachePath = path.resolve("./cache/beatmapsets");

		try {
			rmSync(
				path.join(
					stagingPath,
					`${this.getCurrentSong().beatmapInfo.id}.zip`
				),
				{
					recursive: true,
				}
			);

			rmSync(
				path.join(cachePath, `${this.getCurrentSong().beatmapInfo.id}`),
				{
					recursive: true,
				}
			);
		} catch (e) {
			void {};
		}
	}

	setLoop(loop: boolean) {
		this.loop = loop;

		return this;
	}

	finalizeQueue(instantly?: boolean) {
		if (instantly) return this.timeoutCallback();

		this.afkDestroyTimeout = setTimeout(
			this.timeoutCallback.bind(this),
			10000
		);
	}

	public getSongs() {
		return this.songs;
	}

	private setSongs(songs: Song[]) {
		return (this.songs = songs);
	}

	private timeoutCallback() {
		try {
			this.deleteBeatmap();

			this.sendFinalizationMessage();

			this.connection.destroy();

			djosu.queues.destroy(this.guildId);
		} catch (e) {
			void {};
		}
	}

	private recalculateIndexes() {
		const currentSong = this.getCurrentSong();
		const currentSongIndex = this.songs.findIndex(
			(s) => s.id == currentSong.id
		);

		this.setSongIndex(currentSongIndex);
	}

	public getSongById(id: string) {
		return this.songs.find((s) => s.id == id);
	}

	public removeSong(songId: string) {
		const targetSongIndex = this.findSongIndexById(songId);

		const songs = this.getSongs();
		songs.splice(targetSongIndex, 1);

		this.setSongs(songs);
		this.recalculateIndexes();

		const recalculatedSongIndex = this.findSongIndexById(songId);

		if (recalculatedSongIndex == this.findCurrentSongIndex()) {
			if (this.getSongIndex() + 1 >= this.getSongs().length)
				return SongRemoveStatus.Destroyed;

			if (this.findCurrentSongIndex() + 1 < this.getSongs().length)
				return SongRemoveStatus.Skip;

			return SongRemoveStatus.None;
		}

		if (recalculatedSongIndex != this.findCurrentSongIndex())
			return SongRemoveStatus.None;

		if (recalculatedSongIndex + 1 >= this.getSongs().length)
			return SongRemoveStatus.Destroyed;

		if (recalculatedSongIndex + 1 < this.getSongs().length)
			return SongRemoveStatus.Skip;

		return SongRemoveStatus.None;
	}

	skipSong() {
		this.deleteBeatmap();

		if (this.getSongIndex() + 1 == this.getSongs().length)
			return this.finalizeQueue();

		this.setSongIndex(this.getSongIndex() + 1);

		this.player.play(this.getSongs()[this.getSongIndex()].getAudio());

		this.sendUpdateMessage();
	}

	previousSong() {
		this.deleteBeatmap();

		if (this.getSongIndex() - 1 < 0) return this.finalizeQueue();

		this.setSongIndex(this.getSongIndex() - 1);

		this.player.play(this.getSongs()[this.getSongIndex()].getAudio());

		this.sendUpdateMessage();
	}

	play() {
		this.selectSong(this.getSongIndex());
	}
}
