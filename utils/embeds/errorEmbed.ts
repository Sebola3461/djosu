import {
	MessagePayload,
	InteractionEditReplyOptions,
	EmbedBuilder,
	ColorResolvable,
} from "discord.js";
import { colors } from "../../constants/colors";

export function errorEmbed(
	replyFunction: (
		options: string | MessagePayload | InteractionEditReplyOptions
	) => void,
	embedInfo: { title?: string; description?: string }
) {
	const embed = new EmbedBuilder()
		.setTitle(embedInfo.title || "❌ Something went wrong...")
		.setDescription(embedInfo.description || "`Unknown error`")
		.setColor(colors.red as ColorResolvable);

	replyFunction({
		embeds: [embed],
		components: [],
	});
}
