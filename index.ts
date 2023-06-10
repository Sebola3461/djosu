import { config } from "dotenv";
import { DjOsu } from "./struct/core/DjOsu";
config();

const bot = new DjOsu();
bot.initialize();
export const djosu = bot;
