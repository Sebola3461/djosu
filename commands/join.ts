import { ColorResolvable, EmbedBuilder, GuildMember } from "discord.js";

import { djosu } from "..";
import { colors } from "../constants/colors";
import { SlashCommand } from "../struct/commands/SlashCommand";
import { clientHasValidVoicePermissions } from "../utils/checkers/clientHasValidVoicePermissions";
import { errorEmbed } from "../utils/embeds/errorEmbed";

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

			if (!clientHasValidVoicePermissions(voiceChannel))
				return errorEmbed(command.editReply.bind(command), {
					description: `I don't have permissions to join or speak on <#${voiceChannel.id}>! If you're an admin, please fix my permissions.`,
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
