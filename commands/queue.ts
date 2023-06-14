import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ColorResolvable,
	EmbedBuilder,
	InteractionCollector,
} from "discord.js";
import { djosu } from "..";
import { SlashCommand } from "../struct/commands/SlashCommand";
import { Song } from "../struct/core/Song";
import { errorEmbed } from "../utils/embeds/errorEmbed";
import { generateChunks } from "../utils/transformers/arrayChunk";
import { colors } from "../constants/colors";
import { randomUUID } from "crypto";

export default new SlashCommand()
	.setName("queue")
	.setDescription("List all songs in the queue")
	.setExecutable(async (command) => {
		if (!command.guildId) return;

		const queue = djosu.queues.getQueue(command.guildId);

		if (!queue)
			return errorEmbed(command.editReply.bind(command), {
				description: "There's nothing playing here!",
			});

		interface DescriptionChunk {
			song: Song;
			text: string;
		}

		const currentSong = queue.getCurrentSong();
		const currentSongIndex = currentSong
			? queue.getSongs().indexOf(currentSong)
			: -1;
		const chunksList = generateChunks<DescriptionChunk>(
			queue.getSongs().map((song, i) => {
				return {
					song: song,
					text: `**#${i + 1} |** [${song.beatmapInfo.artist} - ${
						song.beatmapInfo.title
					}](https://osu.ppy.sh/s/${song.beatmapInfo.id})${
						i == currentSongIndex ? " (Current Song)" : ""
					} | ${song.user}`,
				};
			}),
			10
		);
		const interactionHandshake = randomUUID();

		let currentPage = chunksList.findIndex((chunk: DescriptionChunk[]) =>
			chunk.find((component: DescriptionChunk) =>
				currentSong ? component.song.id == currentSong.id : 0
			)
		);

		generatePage(currentPage);

		const collector = new InteractionCollector(command.client, {
			filter: (i) => i.user.id == command.user.id,
			time: 60000,
		});

		collector.on("collect", async (button: ButtonInteraction) => {
			if (!button.isButton()) return;

			const targets = button.customId.split(",");

			collector.resetTimer();

			if (targets[0] != interactionHandshake) return;
			await button.deferUpdate();

			const action = targets[1] as "back" | "none" | "next";

			if (action == "next") currentPage++;
			if (action == "back") currentPage--;

			generatePage(currentPage);
		});

		function generatePage(page: number) {
			const chunkContent = chunksList[page];

			if (!chunkContent) return;

			const backPage = new ButtonBuilder()
				.setLabel("◀️")
				.setCustomId(`${interactionHandshake},back`)
				.setStyle(ButtonStyle.Secondary);
			const pageInfo = new ButtonBuilder()
				.setLabel(`${page + 1} of ${chunksList.length}`)
				.setCustomId(`${interactionHandshake},none`)
				.setStyle(ButtonStyle.Secondary);
			const nextPage = new ButtonBuilder()
				.setLabel("▶️")
				.setCustomId(`${interactionHandshake},next`)
				.setStyle(ButtonStyle.Secondary);

			const buttons = new ActionRowBuilder<ButtonBuilder>().setComponents(
				backPage,
				pageInfo,
				nextPage
			);

			const embed = new EmbedBuilder()
				.setTitle("📑 Current queue")
				.setDescription(chunkContent.map((c) => c.text).join("\n"))
				.setColor(colors.blue as ColorResolvable);

			command.editReply({
				embeds: [embed],
				components: [buttons],
			});
		}
	});
