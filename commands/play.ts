import {
	ActionRowBuilder,
	ColorResolvable,
	EmbedBuilder,
	GuildMember,
	GuildTextBasedChannel,
	InteractionCollector,
	SlashCommandStringOption,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
} from "discord.js";
import { SlashCommand } from "../struct/commands/SlashCommand";
import { BeatmapsetImporter } from "../struct/osu/BeatmapsetImporter";
import { v2 } from "osu-api-extended";
import { resolve } from "path";
import { readFileSync } from "fs";
import { Song } from "../struct/core/Song";
import { djosu } from "..";
import osuApi from "../utils/fetcher/osuApi";
import { BeatmapStatus, Beatmapset } from "../types/beatmap";
import { errorEmbed } from "../utils/embeds/errorEmbed";
import { randomUUID } from "crypto";
import { AudioPlayerStatus } from "@discordjs/voice";
import { addedToQueueEmbed } from "../utils/embeds/addedToQueueEmbed";
import { colors } from "../constants/colors";
import { infoEmbed } from "../utils/embeds/infoEmbed";
import truncateString from "../utils/transformers/truncateString";
import { parseOsuBeatmapURL } from "../utils/transformers/parseOsuBeatmapURL";

export default new SlashCommand()
	.setName("play")
	.setDescription("Play a song from a beatmap")
	.addOptions(
		new SlashCommandStringOption()
			.setName("search")
			.setDescription("Beatmap to play")
			.setRequired(true)
	)
	.setExecutable(async (command) => {
		try {
			if (!command.guildId) return;

			const query = command.options.getString("search", true);

			const voiceChannel = (command.member as GuildMember).voice.channel;

			if (!voiceChannel)
				return errorEmbed(command.editReply.bind(command), {
					description: "You need to join a voice channel!",
				});

			const guildQueue = djosu.queues.getQueue(command.guildId);

			if (guildQueue && guildQueue.channelId != voiceChannel.id)
				return errorEmbed(command.editReply.bind(command), {
					description: `I'm playing song in another channel! Please, join <#${guildQueue.channelId}> and try again.`,
				});

			function getSearchOrBeatmapIds() {
				const beatmap = parseOsuBeatmapURL(query);

				if (beatmap.error || !beatmap.data) return query;

				if (beatmap.data.beatmapset_id)
					return beatmap.data.beatmapset_id;

				if (beatmap.data.beatmap_id) return beatmap.data.beatmap_id;

				return query;
			}

			const search = await osuApi.fetch.searchBeatmapset({
				query: getSearchOrBeatmapIds(),
				nsfw: true,
				status: BeatmapStatus.any,
			});

			if (search.status != 200)
				return errorEmbed(command.editReply, {
					description: `Fetch error: ${search.status}`,
				});

			search.data.beatmapsets = search.data.beatmapsets.filter(
				(b) => !b.storyboard
			);
			search.data.beatmapsets.splice(25, 99999);

			const searchEmbed = new EmbedBuilder()
				.setTitle(`🔍 Search results`)
				.setDescription(
					search.data.beatmapsets.length == 0
						? "There's no valid results..."
						: `Displaying ${search.data.beatmapsets.length} results for \`${query}\``
				)
				.setColor(colors.pink as ColorResolvable);

			const interactionHandshake = randomUUID();
			const searchSelectMenu = new StringSelectMenuBuilder()
				.setPlaceholder("Select a beatmap")
				.addOptions(
					search.data.beatmapsets.map((b, i) => {
						return {
							label: truncateString(
								`${b.artist} - ${b.title}`,
								80,
								true
							),
							description: `beatmapset by ${b.creator} | Status: ${b.status}`,
							value: b.id.toString(),
						};
					})
				)
				.setCustomId(interactionHandshake);

			await command.editReply({
				embeds: [searchEmbed],
				components:
					search.data.beatmapsets.length == 0
						? []
						: [
								new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
									searchSelectMenu
								),
						  ],
			});

			const collector = new InteractionCollector(command.client, {
				filter: (i) =>
					i.user.id == command.user.id &&
					i.customId == interactionHandshake,
			});

			collector.on(
				"collect",
				async (menu: StringSelectMenuInteraction) => {
					await menu.deferUpdate();

					const beatmapset = search.data.beatmapsets.find(
						(b) => b.id.toString() == menu.values[0]
					);

					if (beatmapset) handleBeatmap(beatmapset);

					collector.stop("selected");
				}
			);

			async function handleBeatmap(beatmapset: Beatmapset) {
				if (guildQueue) guildQueue.clearDestroyTimeout();

				if (beatmapset.beatmaps?.find((b) => b.total_length > 480))
					return errorEmbed(command.editReply.bind(command), {
						description:
							"Beatmap too long! I can't play anything longer than 8 minutes.",
					});

				infoEmbed(command.editReply.bind(command), {
					description: `Downloading beatmap...`,
				});

				const oszFile = await v2.beatmap.set.download(
					Number(beatmapset.id),
					resolve(`./cache/staging/${beatmapset.id}.zip`),
					"osu",
					true
				);

				if (!oszFile) return;

				const importer = new BeatmapsetImporter(
					readFileSync(
						resolve(`./cache/staging/${beatmapset.id}.zip`)
					),
					beatmapset.id.toString()
				);
				await importer.importOSZ();
				importer.loadDifficulties();

				const audioFile = importer.getAudioFileFromIndex(0);

				if (!audioFile) return;

				if (
					!command.member ||
					!command.guildId ||
					!command.channel ||
					!voiceChannel
				)
					return;

				const song = new Song(beatmapset, command.user, audioFile);

				if (!djosu.queues.getQueue(command.guildId)) {
					djosu.queues.createQueue(voiceChannel);
				}

				djosu.queues.setQueueTextChannel(
					command.channel as GuildTextBasedChannel
				);

				const queue = djosu.queues.addSongToQueue(song, voiceChannel);

				if (
					queue &&
					queue.player.state.status == AudioPlayerStatus.Playing
				) {
					command.editReply(addedToQueueEmbed(song));
				} else {
					command.deleteReply();
				}
			}
		} catch (e: any) {
			console.error(e);
			errorEmbed(command.editReply.bind(this), {
				description: e.message || "Unknown Error...",
			});
		}
	});
