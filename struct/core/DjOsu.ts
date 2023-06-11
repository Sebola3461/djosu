import {
	ActivityType,
	ButtonInteraction,
	Client,
	ColorResolvable,
	EmbedBuilder,
	GuildMember,
	Interaction,
} from "discord.js";
import { LoggerService } from "../general/LoggerService";
import { CommandsManager } from "../commands/CommandsManager";
import { generateOsuApiToken } from "../../utils/fetcher/startConnection";
import { auth } from "osu-api-extended";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { MusicQueueManager } from "./MusicQueueManager";
import { colors } from "../../constants/colors";

export class DjOsu extends Client {
	private logger = new LoggerService("DjOsu");
	public commands = new CommandsManager(this);
	public queues = new MusicQueueManager(this);

	constructor() {
		super({
			intents: [
				"GuildMembers",
				"GuildVoiceStates",
				"Guilds",
				"MessageContent",
			],
		});
	}

	async initialize() {
		this.logger.printWarning("Initializing DjOsu...");

		this.checkCacheFolders();

		generateOsuApiToken();

		this.loadFFMPEG();

		auth.login_lazer(
			process.env.OSU_USERNAME,
			process.env.OSU_PASSWORD
		).then((login) => {
			if (!login.access_token)
				return this.logger.printError(`Invalid lazer credentials!`);

			this.logger.printSuccess(`Connected to lazer!`);
		});

		this.updateStatus.bind(this);

		this.login(process.env.TOKEN)
			.then(() => {
				this.logger.printSuccess(
					`Connected to discord as ${this.user?.username}`
				);

				this.commands.initializeCommands();
				this.on("interactionCreate", this.handleInteraction.bind(this));

				setInterval(() => this.updateStatus(), 5000);
			})
			.catch((error) =>
				this.logger.printError("Cannot connect to discord:", error)
			);
	}

	private updateStatus() {
		if (this.user)
			this.user.setPresence({
				status: "online",
				activities: [
					{
						name: `Playing song for ${this.queues.getSize()} servers | ${
							this.guilds.cache.size
						} servers!`,
						type: ActivityType.Playing,
					},
				],
			});
	}

	public async handleEmbedInteractions(button: ButtonInteraction) {
		const targets = button.customId.split(",");

		if (targets[0] != "global" || !button.guildId || !button.member) return;

		await button.deferUpdate();

		const action = targets[1] as
			| "previousSong"
			| "pauseSong"
			| "loopSong"
			| "nextSong";

		const queue = this.queues.getQueue(button.guildId);

		if (!queue) return;

		switch (action) {
			case "previousSong":
				if (
					!queue.checkManagePermissionsFor(
						button.member as GuildMember
					)
				)
					return;

				queue.previousSong();
				break;
			case "nextSong":
				if (
					!queue.checkManagePermissionsFor(
						button.member as GuildMember
					)
				)
					return;

				queue.skipSong();
				break;
			case "pauseSong":
				if (
					!queue.checkManagePermissionsFor(
						button.member as GuildMember
					)
				)
					return;

				queue.pause();
				button.editReply({
					components: [queue.getPlayingEmbedButtons()],
				});
				break;
			case "loopSong":
				if (
					!queue.checkAdminPermissionsFor(
						button.member as GuildMember
					)
				)
					return;

				queue.setLoop(!queue.loop);
				queue.sendUpdateMessage();
				break;
		}
	}

	handleInteraction(interaction: Interaction) {
		if (interaction.isChatInputCommand())
			this.commands.handleCommandInteraction(interaction);

		if (interaction.isButton()) this.handleEmbedInteractions(interaction);
	}

	private loadFFMPEG() {
		process.env.FFMPEG_PATH = path.resolve("./bin/ffmpeg.exe");
		process.env.FFMPROBE_PATH = path.resolve("./bin/ffmprobe.exe");
	}

	private checkCacheFolders() {
		if (!existsSync(path.resolve("./cache")))
			mkdirSync(path.resolve("./cache"));

		if (!existsSync(path.resolve("./cache/staging")))
			mkdirSync(path.resolve("./cache/staging"));

		if (!existsSync(path.resolve("./cache/beatmapsets")))
			mkdirSync(path.resolve("./cache/beatmapsets"));
	}
}
