/**
 * * ======================== startConnection
 * ? Get authorization token
 */

import axios from "axios";
import { LoggerService } from "../../struct/general/LoggerService";
import { OAuthAccessToken } from "../../types/oauth_access_token";

async function listen() {
	const logger = new LoggerService("OsuApi");

	logger.printInfo("Refreshing server authorization token");

	try {
		let tokens = await axios<OAuthAccessToken>(
			"https://osu.ppy.sh/oauth/token",
			{
				method: "post",
				timeout: 999999,
				headers: {
					"Content-Type": "application/json",
				},
				data: JSON.stringify({
					client_id: process.env.OSU_CLIENT_ID,
					client_secret: process.env.OSU_CLIENT_SECRET,
					grant_type: "client_credentials",
					scope: "public",
				}),
			}
		);

		// Auto-Refresh token
		setTimeout(listen, Number(tokens.data.expires_in) * 1000);

		process.env.OSU_API_ACCESS_TOKEN = tokens.data.access_token;
		console.log(process.env.OSU_API_ACCESS_TOKEN);

		logger.printSuccess("Server authorization token refreshed");

		return tokens.data;
	} catch (e: any) {
		logger.printError("Error during token refresh:\n");
		console.error(e);

		setTimeout(listen, 5000);
		return null;
	}
}

export const generateOsuApiToken = listen;
