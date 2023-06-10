import {
	ColorResolvable,
	SlashCommandBooleanOption,
	EmbedBuilder,
} from "discord.js";
import { djosu } from "..";
import { SlashCommand } from "../struct/commands/SlashCommand";
import { errorEmbed } from "../utils/embeds/errorEmbed";
import { colors } from "../constants/colors";

export default new SlashCommand()
	.setName("loop")
	.setDescription("Enable or disable loop")
	.addOptions(
		new SlashCommandBooleanOption()
			.setName("enabled")
			.setDescription("Loop state")
			.setRequired(true)
	)
	.setExecutable(async (command) => {
		if (!command.guildId) return;

		const isLoop = command.options.getBoolean("enabled", true);

		const queue = djosu.queues.getQueue(command.guildId);

		if (!queue)
			return errorEmbed(command.editReply.bind(command), {
				description: "There's nothing playing here!",
			});

		queue.setLoop(isLoop);

		const result = new EmbedBuilder()
			.setTitle(`✅ Loop is now ${isLoop ? "enabled" : "disabled"}!`)
			.setColor(colors.green as ColorResolvable);

		command.editReply({
			embeds: [result],
		});
	});
