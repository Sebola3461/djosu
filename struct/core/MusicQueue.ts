import {
	AudioPlayer,
	AudioPlayerPlayingState,
	AudioPlayerStatus,
	createAudioPlayer,
	joinVoiceChannel,
	NoSubscriberBehavior,
	VoiceConnection,
	VoiceConnectionSignallingState,
} from "@discordjs/voice";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ColorResolvable,
	EmbedBuilder,
	GuildMember,
	GuildTextBasedChannel,
	Message,
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
import { createConnection } from "net";
import { generateTextProgressBar } from "../../utils/transformers/generateTextProgressBar";
import { percentageOf } from "../../utils/transformers/percentageOf";
import { percentageOfTotal } from "../../utils/transformers/percentageOfTotal";

export enum SongRemoveStatus {
	Destroyed,
	Skip,
	Previous,
	None,
}

export class MusicQueue {
	public bot!: DjOsu;
	public voiceChannel: VoiceBasedChannel;
	public readonly guildId: string;
	public channelId: string;
	public connection: VoiceConnection;
	public readonly player: AudioPlayer;
	public textChannel!: TextBasedChannel;

	// Controls
	public loop = false;

	// resources
	private currentSongIndex = 0;

	// message
	private lastStatusMessage: Message | null = null;

	private songs: Song[] = [];

	private afkDestroyTimeout: NodeJS.Timeout | null = null;
	private isLocked = false;

	constructor(options: { bot: DjOsu; channel: VoiceBasedChannel }) {
		this.player = createAudioPlayer({
			behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
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
		this.isQueueLocked.bind(this);

		this.player.on("stateChange", (state, oldState) => {
			if (this.isQueueLocked()) return;

			if (
				state.status == AudioPlayerStatus.Playing &&
				oldState.status == AudioPlayerStatus.Idle
			) {
				if (this.isLoop()) {
					this.play();
				} else {
					this.skipSong();

					if (this.getSongs().length == this.getCurrentSongIndex()) {
						this.sendClearQueueMessage();
						this.finalizeQueue();
						return;
					}
				}

				return;
			}
		});
	}

	public getCurrentSongIndex() {
		return this.currentSongIndex;
	}

	private setLock(locked: boolean) {
		this.isLocked = locked;

		return this;
	}

	public setVoiceChannel(channel: VoiceBasedChannel) {
		this.voiceChannel = channel;
		this.channelId = channel.id;
		this.connection.destroy();
		this.connection = joinVoiceChannel({
			channelId: this.channelId,
			guildId: this.guildId,
			adapterCreator: channel.guild.voiceAdapterCreator,
		});
		this.connection.subscribe(this.player);

		return this;
	}

	private isQueueLocked() {
		return this.isLocked;
	}

	public checkManagePermissionsFor(member: GuildMember) {
		const currentSong = this.getCurrentSong();

		if (!currentSong) return true;

		if (!this.voiceChannel.members.has(currentSong.user.id)) return true;

		if (
			this.voiceChannel.members.size == 2 &&
			this.voiceChannel.members.has(member.id)
		)
			return true;

		if (currentSong.user.id == member.id) return true;

		if (
			currentSong.user.id != member.id &&
			!member.permissions.has("DeafenMembers", true) &&
			!member.permissions.has("MuteMembers", true) &&
			!member.permissions.has("ManageChannels", true)
		)
			return false;

		return true;
	}

	public checkAdminPermissionsFor(member: GuildMember) {
		const currentSong = this.getCurrentSong();

		if (!currentSong) return true;

		if (
			this.voiceChannel.members.size == 2 &&
			this.voiceChannel.members.has(member.id)
		)
			return true;

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
			.setLabel("⏮️ Previous")
			.setCustomId(`global,previousSong`)
			.setStyle(ButtonStyle.Secondary);
		const pauseSong = new ButtonBuilder()
			.setLabel("⏯️ Pause")

			.setCustomId(`global,pauseSong`)
			.setStyle(
				this.player.state.status == AudioPlayerStatus.Paused
					? ButtonStyle.Success
					: ButtonStyle.Secondary
			);
		const loopToggle = new ButtonBuilder()
			.setLabel("🔁 Loop")
			.setCustomId(`global,loopSong`)
			.setStyle(
				this.isLoop() ? ButtonStyle.Success : ButtonStyle.Secondary
			);
		const timeUpdate = new ButtonBuilder()
			.setLabel("🕒 Position")
			.setCustomId(`global,update`)
			.setStyle(ButtonStyle.Secondary);
		const nextSong = new ButtonBuilder()
			.setLabel("⏭️ Next Song")
			.setCustomId(`global,nextSong`)
			.setStyle(ButtonStyle.Secondary);

		return [
			new ActionRowBuilder<ButtonBuilder>().setComponents(
				previousSong,
				pauseSong,
				loopToggle,
				nextSong,
				timeUpdate
			),
		];
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

	changeAudioRate(rate: number, modifyPitch: boolean) {
		const currentSong = this.getCurrentSong();

		if (!currentSong) return false;

		this.player.pause();

		currentSong
			.setRate(rate, modifyPitch)
			.then(() => {
				this.player.stop();
				this.selectSong(this.getCurrentSongIndex());

				this.sendUpdateMessage();

				return true;
			})
			.catch(() => {
				this.player.unpause();
				return false;
			});

		return true;
	}

	selectSong(index: number) {
		this.setSongIndex(index);
		const currentSong = this.getCurrentSong();

		if (!currentSong) return;

		this.player.play(currentSong.getAudio());
	}

	getCurrentSong(): Song | undefined {
		return this.getSongs()[this.getCurrentSongIndex()];
	}

	findCurrentSongIndex() {
		const currentSong = this.getCurrentSong();

		if (!currentSong) return -1;

		return this.getSongs().findIndex((c) => c.id == currentSong.id);
	}

	findSongIndexById(songId: string) {
		return this.getSongs().findIndex((c) => c.id == songId);
	}

	public sendUpdateMessage() {
		if (this.lastStatusMessage)
			this.lastStatusMessage.delete().catch(() => {
				void {};
			});

		this.setLastMessage.bind(this);

		this.textChannel
			.send(this.generateQueueMessage())
			.then((message) => this.setLastMessage(message))
			.catch(() => void {});
	}

	public sendClearQueueMessage() {
		if (this.isQueueLocked()) return;

		if (this.lastStatusMessage)
			this.lastStatusMessage.delete().catch(() => {
				void {};
			});

		this.textChannel
			.send(this.generateClearQueueMessage())
			.catch(() => void {});
	}

	private sendFinalizationMessage() {
		if (this.isQueueLocked()) return;

		if (this.lastStatusMessage)
			this.lastStatusMessage.delete().catch(() => {
				void {};
			});

		this.textChannel.send(this.generateAfkEmbed()).catch(() => void {});
	}

	private setLastMessage(message: Message) {
		this.lastStatusMessage = message;

		return this;
	}

	private generateClearQueueMessage() {
		const embed = new EmbedBuilder()
			.setAuthor({
				name: "🎵 Queue is now empty!",
			})
			.setColor(colors.blue as ColorResolvable);

		return {
			embeds: [embed],
		};
	}

	private generateAfkEmbed() {
		const embed = new EmbedBuilder()
			.setAuthor({
				name: "🎵 The queue was afk and ended.",
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
		this.lastStatusMessage = null;

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
				`${currentSong?.beatmapInfo.artist} - ${currentSong?.beatmapInfo.title}`
			)
			.setURL(
				`https://osu.ppy.sh/beatmapsets/${currentSong?.beatmapInfo.id}`
			)
			.setThumbnail(
				`https://b.ppy.sh/thumb/${currentSong?.beatmapInfo.id}l.jpg`
			)
			.setDescription(
				`👤 Requested by: <@${currentSong?.user.id}> | 🕒 Rate: ${
					currentSong?.playbackRate
				}x\n${timeString(
					this.player.state.status == AudioPlayerStatus.Playing
						? (this.player.state.resource?.playbackDuration ||
								1000) / 1000
						: 0
				)}/${timeString(
					currentSong?.duration || 0
				)} ${this.generateStaticSeekBar()}`
			)
			.setColor(colors.pink as ColorResolvable);

		return {
			embeds: [embed],
			components: this.getPlayingEmbedButtons(),
		};
	}

	private generateStaticSeekBar() {
		const playerState = this.player.state as AudioPlayerPlayingState;
		const currentPosition = playerState.playbackDuration / 1000;
		const currentPositionPercentage = percentageOfTotal(
			currentPosition,
			this.getCurrentSong()?.duration || 0
		);
		const maxBars = 15;

		const barsCount = Math.round(
			percentageOf(Math.round(currentPositionPercentage), maxBars)
		);

		return `${generateTextProgressBar(barsCount, maxBars)}`;
	}

	private deleteBeatmap() {
		const stagingPath = path.resolve("./cache/staging");
		const cachePath = path.resolve("./cache/beatmapsets");

		const currentSong = this.getCurrentSong();

		if (!currentSong) return;

		try {
			rmSync(
				path.join(stagingPath, `${currentSong.beatmapInfo.id}.zip`),
				{
					recursive: true,
				}
			);

			rmSync(path.join(cachePath, `${currentSong.beatmapInfo.id}`), {
				recursive: true,
			});
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
			60000
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

			this.player.stop();
			this.connection.destroy();

			if (this.afkDestroyTimeout) clearTimeout(this.afkDestroyTimeout);

			this.setLock(true);

			djosu.queues.destroy(this.guildId);
		} catch (e) {
			void {};
		}
	}

	private recalculateIndexes() {
		const currentSong = this.getCurrentSong();

		if (!currentSong) return this.setSongIndex(0);

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

		if (this.getSongIndex() + 1 >= this.getSongs().length) {
			this.setSongIndex(this.getSongIndex() + 1);

			this.player.stop();

			return;
		}

		this.setSongIndex(this.getSongIndex() + 1);

		const currentSong = this.getCurrentSong();

		if (!currentSong) return;

		this.player.play(currentSong.getAudio());

		this.sendUpdateMessage();
	}

	previousSong() {
		this.deleteBeatmap();

		if (this.getSongIndex() - 1 < 0) return;

		this.setSongIndex(this.getSongIndex() - 1);

		const currentSong = this.getCurrentSong();

		if (!currentSong) return;

		this.player.play(currentSong.getAudio());

		this.sendUpdateMessage();
	}

	play() {
		this.selectSong(this.getSongIndex());
	}
}
