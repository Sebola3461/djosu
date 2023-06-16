import { GuildMember, SlashCommandStringOption } from "discord.js";

import { djosu } from "..";
import { SlashCommand } from "../struct/commands/SlashCommand";
import { errorEmbed } from "../utils/embeds/errorEmbed";
import { infoEmbed } from "../utils/embeds/infoEmbed";

export default new SlashCommand()
	.setName("rate")
	.setDescription("Change current audio playback rate")
	.addOptions(
		new SlashCommandStringOption()
			.setName("rate")
			.setDescription("What rate do you want?")
			.setChoices(
				{
					name: "DT",
					value: "1.5",
				},
				{
					name: "HT",
					value: "0.75",
				}
			)
			.setRequired(true)
	)
	.setExecutable(async (command) => {
		try {
			if (!command.guildId || !command.member) return;

			const input = command.options.getString("rate", true);
			let newRate = Number(input);

			const queue = djosu.queues.getQueue(command.guildId);

			if (!queue)
				return errorEmbed(command.editReply.bind(command), {
					description: "There's nothing playing here!",
				});

			const currentSong = queue.getCurrentSong();

			if (!currentSong)
				return errorEmbed(command.editReply.bind(command), {
					description: "There's nothing playing here!",
				});

			const voiceChannel = (command.member as GuildMember).voice.channel;

			if (!voiceChannel)
				return errorEmbed(command.editReply.bind(command), {
					description: "You need to join a voice channel!",
				});

			if (
				queue &&
				queue.channelId != voiceChannel.id &&
				!queue.checkAdminPermissionsFor(command.member as GuildMember)
			)
				return errorEmbed(command.editReply.bind(command), {
					description: `I'm playing song in another channel! Please, join <#${queue.channelId}> and try again.`,
				});

			if (!queue.checkManagePermissionsFor(command.member as GuildMember))
				return errorEmbed(command.editReply.bind(command), {
					description: "You don't have permissions to do it.",
				});

			if (newRate == 1.0 && currentSong.playbackRate != 1.0) {
				if (currentSong.playbackRate == 1.5) newRate = 0.5;
				if (currentSong.playbackRate == 0.75) newRate = 1.35;
			}

			const rate = queue.changeAudioRate(newRate, false);

			if (!rate)
				return errorEmbed(command.editReply.bind(command), {
					description: "Error during song conversion!",
				});

			infoEmbed(command.editReply.bind(command), {
				description:
					input == "1.5"
						? "Enabled DT"
						: input == "0.75"
						? "Enabled HT"
						: "Disabled all mods",
			});
		} catch (e: any) {
			console.error(e);
			errorEmbed(command.editReply.bind(command), {
				description: e.message || "Unknown Error...",
			});
		}
	});
