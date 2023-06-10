declare global {
	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV: "development" | "production";
			OSU_CLIENT_SECRET: string;
			OSU_CLIENT_ID: string;
			MONGO_CONNECTION: string;
			OSU_USERNAME: string;
			OSU_PASSWORD: string;
			TOKEN: string;
		}
	}
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
