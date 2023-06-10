import {
	MessagePayload,
	InteractionEditReplyOptions,
	EmbedBuilder,
	ColorResolvable,
} from "discord.js";
import { colors } from "../../constants/colors";

export function infoEmbed(
	replyFunction: (
		options: string | MessagePayload | InteractionEditReplyOptions
	) => void,
	embedInfo: { title?: string; description?: string }
) {
	const embed = new EmbedBuilder()
		.setTitle(embedInfo.title || ":information_source: Info")
		.setDescription(embedInfo.description || "please wait...")
		.setColor(colors.blue as ColorResolvable);

	replyFunction({
		embeds: [embed],
		components: [],
	});
}
