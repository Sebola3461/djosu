import { GuildMember } from "discord.js";
import { djosu } from "..";
import { SlashCommand } from "../struct/commands/SlashCommand";
import { errorEmbed } from "../utils/embeds/errorEmbed";

export default new SlashCommand()
	.setName("disconnect")
	.setDescription("Disconnect and finalize queue")
	.setExecutable(async (command) => {
		if (!command.guildId || !command.member) return;

		const queue = djosu.queues.getQueue(command.guildId);

		if (!queue)
			return errorEmbed(command.editReply.bind(command), {
				description: "There's nothing playing here!",
			});

		if (!queue.checkAdminPermissionsFor(command.member as GuildMember))
			return errorEmbed(command.editReply.bind(command), {
				description: "You don't have permissions to do it.",
			});
		command.deleteReply();
		queue.finalizeQueue(true, "Queue ended!");
	});
