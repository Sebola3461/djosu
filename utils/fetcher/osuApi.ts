import {
	allBeatmapsetEvents,
	basicUserBeatmap,
	beatmap,
	beatmapset,
	beatmapsetDiscussion,
	beatmapsetDiscussionPost,
	beatmapsetDiscussionVotes,
	featuredBeatmapsets,
	osuFile,
	searchBeatmapset,
	userBeatmaps,
} from "./beatmap";
import { user, userRecent, userRecentActivity, users } from "./user";

export default {
	fetch: {
		beatmap: beatmap,
		beatmapset: beatmapset,
		allBeatmapsetEvents: allBeatmapsetEvents,
		searchBeatmapset: searchBeatmapset,
		featuredBeatmapsets: featuredBeatmapsets,
		beatmapsetDiscussionPost: beatmapsetDiscussionPost,
		beatmapsetDiscussion: beatmapsetDiscussion,
		beatmapsetDiscussionVotes: beatmapsetDiscussionVotes,
		user: user,
		userRecentActivity: userRecentActivity,
		users,
		basicUserBeatmaps: basicUserBeatmap,
		userBeatmaps: userBeatmaps,
		userRecent: userRecent,
		osuFile: osuFile,
	},
};
