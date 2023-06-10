import { ChatInputCommandInteraction } from "discord.js";
import { DjOsu } from "../core/DjOsu";
import { readdirSync } from "fs";
import path from "path";
import { SlashCommand } from "./SlashCommand";
import { LoggerService } from "../general/LoggerService";

export class CommandsManager {
	public bot: DjOsu;
	private rawCommands: SlashCommand[] = [];
	private logger = new LoggerService("CommandsManager");

	constructor(bot: DjOsu) {
		this.bot = bot;
	}

	public async initializeCommands() {
		this.logger.printInfo("Initializing commands...");
		await this.loadCommands();
		await this.uploadCommands();
	}

	private async loadCommands() {
		const commandFiles = readdirSync(
			path.resolve(__dirname + "/../../commands")
		);

		for (const filename of commandFiles) {
			const file = (await import(
				path.join(path.resolve(__dirname + "/../../commands"), filename)
			)) as { default: SlashCommand };

			this.rawCommands.push(file.default);
		}

		this.logger.printSuccess(`Loaded ${this.rawCommands.length} commands!`);

		return void {};
	}

	private async uploadCommands() {
		const APICommands = this.rawCommands.map((c) => c.toJSON());

		if (!this.bot.application)
			return this.logger.printError("Invalid application!");

		await this.bot.application.commands.set(APICommands);

		this.logger.printSuccess(`Uploaded ${APICommands.length} commands!`);

		return void {};
	}

	handleCommandInteraction(commandInteraction: ChatInputCommandInteraction) {
		const commandName = commandInteraction.commandName;
		const commandGroup =
			commandInteraction.options.getSubcommandGroup(false);
		const commandSubcommand =
			commandInteraction.options.getSubcommand(false);

		if (commandName && !commandGroup && !commandSubcommand) {
			this.executeCommand(commandName, commandInteraction);
		}
	}

	private async executeCommand(
		commandName: string,
		commandInteraction: ChatInputCommandInteraction
	) {
		this.logger.printInfo(`Executing command ${commandName}`);
		const targetCommand = this.rawCommands.find(
			(c) => c.name == commandName
		);

		if (!targetCommand) return; /// ? Is this possible??

		if (!targetCommand.hasModal) {
			await commandInteraction.deferReply({
				ephemeral: targetCommand.isEphemeral,
			});
		}

		targetCommand.execute(commandInteraction);
	}
}
