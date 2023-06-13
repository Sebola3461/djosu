import { GuildMember } from "discord.js";
import { djosu } from "..";
import { SlashCommand } from "../struct/commands/SlashCommand";
import { errorEmbed } from "../utils/embeds/errorEmbed";

export default new SlashCommand()
	.setName("skip")
	.setDescription("Skip a song from the queue")
	.setExecutable(async (command) => {
		if (!command.guildId || !command.member) return;

		const queue = djosu.queues.getQueue(command.guildId);

		if (!queue)
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

		command.deleteReply();

		queue.skipSong(false);
	});
