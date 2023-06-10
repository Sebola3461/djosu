import axios from "axios";
import { LoggerService } from "../../struct/general/LoggerService";
import { User, UserRecentEvent, UserResponse } from "../../types/user";
import { IHTTPResponse } from "../../types/http";
import { UserScoreResponse } from "../../types/score";

const logger = new LoggerService("UserFetcher");

export async function user(
	user_id: string,
	mode?: string
): Promise<UserResponse> {
	try {
		logger.printInfo(`Fetching user ${user_id}`);

		const req = await axios(parseMode(), {
			headers: {
				authorization: `Bearer ${process.env.OSU_API_ACCESS_TOKEN}`,
			},
		});

		const res = req.data;

		logger.printSuccess(`user ${user_id} found!`);

		function parseMode() {
			let link = "https://osu.ppy.sh/api/v2/users/".concat(user_id);

			if (mode) {
				link = `https://osu.ppy.sh/api/v2/users/${user_id}/${mode}`;
			}

			return link;
		}

		return {
			status: 200,
			data: res,
		};
	} catch (e: any) {
		logger.printError("Wtf an error:");
		console.error(e);

		return {
			status: 500,
			data: e,
		};
	}
}

export async function userRecentActivity(
	user_id: string
): Promise<IHTTPResponse<UserRecentEvent[]>> {
	try {
		logger.printInfo(`Fetching user recent activity ${user_id}`);

		const req = await axios(
			`https://osu.ppy.sh/api/v2/users/${user_id}/recent_activity`,
			{
				headers: {
					authorization: `Bearer ${process.env.OSU_API_ACCESS_TOKEN}`,
				},
			}
		);

		const res = req.data;

		logger.printSuccess(`user ${user_id} recent activity found!`);

		return {
			status: 200,
			data: res,
		};
	} catch (e: any) {
		logger.printError("Wtf an error:");
		console.error(e);

		return {
			status: 500,
			data: e,
		};
	}
}

export async function users(
	ids: string[],
	mode?: string
): Promise<IHTTPResponse<User[]>> {
	try {
		logger.printInfo(`Fetching users`);

		let url = "https://osu.ppy.sh/api/v2/users?";
		ids.forEach((id) => {
			url = url.concat(`ids[]=${id}&`);
		});

		const req = await axios(url, {
			headers: {
				authorization: `Bearer ${process.env.OSU_API_ACCESS_TOKEN}`,
			},
		});

		const res = req.data.users;

		logger.printSuccess(`user found!`);

		return {
			status: 200,
			data: res,
		};
	} catch (e: any) {
		logger.printError("Wtf an error:");
		console.error(e);

		return {
			status: 500,
			data: e,
		};
	}
}

export async function userRecent(
	user_id: string,
	include_fails?: number,
	mode?: string
): Promise<UserScoreResponse> {
	try {
		logger.printInfo(`Fetching user ${user_id} recent scores`);

		const req = await axios(parseMode(), {
			headers: {
				authorization: `Bearer ${process.env.OSU_API_ACCESS_TOKEN}`,
			},
		});

		const res = req.data;

		logger.printSuccess(`user ${user_id} recent scores found!`);

		if (!include_fails) include_fails = 1;

		function parseMode() {
			let link = `https://osu.ppy.sh/api/v2/users/${user_id}/scores/recent?include_fails=${include_fails}`;

			if (mode) {
				link = `https://osu.ppy.sh/api/v2/users/${user_id}/scores/recent?include_fails=${include_fails}&mode=${mode}`;
			}

			return link;
		}

		return {
			status: 200,
			data: res,
		};
	} catch (e: any) {
		logger.printError("Wtf an error:");
		console.error(e);

		return {
			status: 500,
			data: e,
		};
	}
}
