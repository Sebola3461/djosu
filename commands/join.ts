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
	.setName("join")
	.setDescription("Move bot from afk voice channels")
	.setExecutable(async (command) => {
		try {
			if (!command.guildId) return;

			const voiceChannel = (command.member as GuildMember).voice.channel;

			if (!voiceChannel)
				return errorEmbed(command.editReply.bind(command), {
					description: "You need to join a voice channel!",
				});

			const guildQueue = djosu.queues.getQueue(command.guildId);

			if (!guildQueue)
				return errorEmbed(command.editReply.bind(command), {
					description: `No need to use this command, you can just use \`/play\``,
				});

			const guildVoiceChannel = await guildQueue.voiceChannel.fetch();

			if (
				guildVoiceChannel.members.size != 1 &&
				!guildQueue.checkAdminPermissionsFor(
					command.member as GuildMember
				)
			)
				return errorEmbed(command.editReply.bind(command), {
					description: `You can't do it! I'm playing music in <#${guildVoiceChannel.id}>!`,
				});

			if (guildQueue && guildQueue.channelId == voiceChannel.id)
				return errorEmbed(command.editReply.bind(command), {
					description: `Stop trying to invite me to the same channel!`,
				});

			guildQueue.setVoiceChannel(voiceChannel);

			const embed = new EmbedBuilder()
				.setTitle("✅ Voice channel changed!")
				.setDescription(`Changed to ${voiceChannel}`)
				.setColor(colors.green as ColorResolvable);

			command.editReply({
				embeds: [embed],
			});
		} catch (e: any) {
			console.error(e);
			errorEmbed(command.editReply.bind(this), {
				description: e.message || "Unknown Error...",
			});
		}
	});
