import { ColorResolvable, EmbedBuilder } from "discord.js";
import { Song } from "../../struct/core/Song";
import timeString from "../transformers/timeString";
import { colors } from "../../constants/colors";

export function addedToQueueEmbed(song: Song) {
	const firstBeatmap = song.beatmapInfo.beatmaps
		? song.beatmapInfo.beatmaps[0]
		: undefined;

	const embed = new EmbedBuilder()
		.setTitle("📥 Added to queue")
		.setDescription(
			`**[${song.beatmapInfo.artist} - ${
				song.beatmapInfo.title
			}](https://osu.ppy.sh/beatmapsets/${
				song.beatmapInfo.id
			})** | Duration: ${timeString(
				firstBeatmap ? firstBeatmap.total_length : 0
			)}`
		)
		.setThumbnail(`https://b.ppy.sh/thumb/${song.beatmapInfo.id}l.jpg`)
		.setColor(colors.green as ColorResolvable);

	return {
		embeds: [embed],
		components: [],
	};
}
